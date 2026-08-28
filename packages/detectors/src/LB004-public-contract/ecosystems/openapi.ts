import { parse as parseYaml } from "yaml";
import { asRecord } from "../../shared/parseYamlDocuments.js";
import { canonicalize } from "../../shared/canonicalize.js";

function parseDocument(path: string, content: string): Record<string, unknown> | undefined {
  try {
    if (path.endsWith(".json")) return asRecord(JSON.parse(content));
    if (path.endsWith(".yaml") || path.endsWith(".yml")) {
      return asRecord(parseYaml(content, { strict: false }));
    }
    return undefined;
  } catch {
    return undefined;
  }
}

export function isOpenApiDocument(path: string, content: string): boolean {
  const doc = parseDocument(path, content);
  if (doc === undefined) return false;
  const openapi = doc.openapi;
  const swagger = doc.swagger;
  return (
    (typeof openapi === "string" && openapi.startsWith("3.")) ||
    (typeof swagger === "string" && swagger.startsWith("2."))
  );
}

export type OpenApiChangeKind =
  "new-endpoint" | "modified-endpoint" | "removed-endpoint" | "modified-schema";

export interface OpenApiChange {
  kind: OpenApiChangeKind;
  description: string;
}

const HTTP_METHODS = ["get", "put", "post", "delete", "options", "head", "patch", "trace"];

function methodsOf(pathItem: unknown): Record<string, unknown> {
  const record = asRecord(pathItem);
  const methods: Record<string, unknown> = {};
  for (const method of HTTP_METHODS) {
    if (method in record) methods[method] = record[method];
  }
  return methods;
}

function schemasOf(doc: Record<string, unknown>): Record<string, unknown> {
  const components = asRecord(doc.components);
  if (Object.keys(components).length > 0) return asRecord(components.schemas);
  return asRecord(doc.definitions);
}

export function findOpenApiChanges(
  before: string | undefined,
  after: string,
  path: string,
): OpenApiChange[] | undefined {
  const afterDoc = parseDocument(path, after);
  if (afterDoc === undefined) return undefined;
  const beforeDoc = before !== undefined ? parseDocument(path, before) : {};
  if (beforeDoc === undefined) return undefined;

  const changes: OpenApiChange[] = [];

  const beforePaths = asRecord(beforeDoc.paths);
  const afterPaths = asRecord(afterDoc.paths);
  const allPathKeys = new Set([...Object.keys(beforePaths), ...Object.keys(afterPaths)]);

  for (const pathKey of allPathKeys) {
    const beforeMethods = methodsOf(beforePaths[pathKey]);
    const afterMethods = methodsOf(afterPaths[pathKey]);
    const allMethods = new Set([...Object.keys(beforeMethods), ...Object.keys(afterMethods)]);

    for (const method of allMethods) {
      const beforeOp = beforeMethods[method];
      const afterOp = afterMethods[method];

      if (beforeOp === undefined && afterOp !== undefined) {
        changes.push({
          kind: "new-endpoint",
          description: `${method.toUpperCase()} ${pathKey}`,
        });
      } else if (beforeOp !== undefined && afterOp === undefined) {
        changes.push({
          kind: "removed-endpoint",
          description: `${method.toUpperCase()} ${pathKey}`,
        });
      } else if (canonicalize(beforeOp) !== canonicalize(afterOp)) {
        changes.push({
          kind: "modified-endpoint",
          description: `${method.toUpperCase()} ${pathKey}`,
        });
      }
    }
  }

  const beforeSchemas = schemasOf(beforeDoc);
  const afterSchemas = schemasOf(afterDoc);
  for (const name of Object.keys(afterSchemas)) {
    if (
      name in beforeSchemas &&
      canonicalize(beforeSchemas[name]) !== canonicalize(afterSchemas[name])
    ) {
      changes.push({ kind: "modified-schema", description: name });
    }
  }

  return changes;
}
