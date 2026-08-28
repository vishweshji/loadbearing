import type { DetectorDefinition, DetectorContext, Finding, Severity } from "@loadbearing/core";
import { findGraphqlChanges, isGraphqlPath } from "./ecosystems/graphql.js";
import { findOpenApiChanges, isOpenApiDocument } from "./ecosystems/openapi.js";
import { findProtoChanges, isProtoPath } from "./ecosystems/protobuf.js";

function contractFinding(
  path: string,
  severity: Severity,
  title: string,
  description: string,
): Finding {
  return {
    detectorId: "LB004",
    category: "public-contract",
    severity,
    confidence: 1,
    title,
    description,
    rationale:
      "Other components, clients, or organizations may already depend on this interface. " +
      "Changing it can break consumers that were never part of this change.",
    evidence: [{ file: path, kind: "contract-change", description }],
  };
}

const OPENAPI_SEVERITY: Record<string, Severity> = {
  "new-endpoint": "medium",
  "modified-endpoint": "high",
  "removed-endpoint": "high",
  "modified-schema": "high",
};

export const LB004: DetectorDefinition = {
  id: "LB004",
  name: "Public Contract Change",
  description:
    "Detects changes to interfaces that other components, clients, or organizations may " +
    "depend upon: OpenAPI/Swagger documents, Protocol Buffers, and GraphQL schemas. Does not " +
    "yet support AsyncAPI or ad hoc JSON Schema contract paths.",
  defaultSeverity: "high",
  supportedFiles: ["**/*.proto", "**/*.graphql", "**/*.graphqls", "openapi.yaml", "swagger.json"],

  async detect(context: DetectorContext): Promise<Finding[]> {
    const findings: Finding[] = [];

    for (const file of context.changedFiles) {
      if (file.status === "deleted") continue;
      if (file.binary || file.truncated) continue;
      if (file.after === undefined) continue;

      if (isProtoPath(file.path)) {
        for (const change of findProtoChanges(file.before, file.after)) {
          const verb = change.kind === "new" ? "New" : "Changed";
          findings.push(
            contractFinding(
              file.path,
              "high",
              "Protobuf contract change",
              `${verb} ${change.constructKind} ${change.name}`,
            ),
          );
        }
        continue;
      }

      if (isGraphqlPath(file.path)) {
        for (const change of findGraphqlChanges(file.before, file.after)) {
          const verb = change.kind === "new" ? "New" : "Changed";
          findings.push(
            contractFinding(
              file.path,
              "high",
              "GraphQL contract change",
              `${verb} ${change.constructKind} ${change.name}`,
            ),
          );
        }
        continue;
      }

      if (
        (file.path.endsWith(".yaml") ||
          file.path.endsWith(".yml") ||
          file.path.endsWith(".json")) &&
        isOpenApiDocument(file.path, file.after)
      ) {
        const changes = findOpenApiChanges(file.before, file.after, file.path);
        if (changes === undefined) continue;
        for (const change of changes) {
          findings.push(
            contractFinding(
              file.path,
              OPENAPI_SEVERITY[change.kind] ?? "high",
              "OpenAPI contract change",
              change.description,
            ),
          );
        }
      }
    }

    return findings;
  },
};
