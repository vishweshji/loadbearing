import { parse as parseYaml } from "yaml";
import { asRecord } from "../../shared/parseYamlDocuments.js";

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

function resourcesOf(doc: Record<string, unknown>): Record<string, unknown> {
  return asRecord(doc.Resources);
}

export function isCloudFormationDocument(path: string, content: string): boolean {
  const doc = parseDocument(path, content);
  if (doc === undefined) return false;
  const resources = resourcesOf(doc);
  const values = Object.values(resources);
  if (values.length === 0) return false;
  return values.some((value) => {
    const type = asRecord(value).Type;
    return typeof type === "string" && /^(AWS|Custom|Alexa)::/.test(type);
  });
}

export interface CloudFormationResourceRef {
  logicalId: string;
  type: string;
}

export function findNewCloudFormationResources(
  before: string | undefined,
  after: string,
  path: string,
): CloudFormationResourceRef[] | undefined {
  const afterDoc = parseDocument(path, after);
  if (afterDoc === undefined) return undefined;
  const beforeDoc = before !== undefined ? parseDocument(path, before) : {};
  if (beforeDoc === undefined) return undefined;

  const beforeResources = resourcesOf(beforeDoc);
  const afterResources = resourcesOf(afterDoc);

  const changes: CloudFormationResourceRef[] = [];
  for (const [logicalId, value] of Object.entries(afterResources)) {
    if (logicalId in beforeResources) continue;
    const type = asRecord(value).Type;
    changes.push({ logicalId, type: typeof type === "string" ? type : "unknown" });
  }
  return changes;
}
