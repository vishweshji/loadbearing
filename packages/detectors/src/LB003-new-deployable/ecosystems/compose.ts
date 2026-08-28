import { basename } from "node:path";
import { parse } from "yaml";
import { asRecord } from "../../shared/parseYamlDocuments.js";

const COMPOSE_FILENAMES = new Set([
  "docker-compose.yml",
  "docker-compose.yaml",
  "compose.yml",
  "compose.yaml",
]);

export function isComposePath(path: string): boolean {
  return COMPOSE_FILENAMES.has(basename(path));
}

function extractServiceNames(content: string): Set<string> {
  try {
    const doc = parse(content, { strict: false });
    const services = asRecord(doc).services;
    return new Set(Object.keys(asRecord(services)));
  } catch {
    return new Set();
  }
}

export function findNewComposeServices(before: string | undefined, after: string): string[] {
  const afterServices = extractServiceNames(after);
  const beforeServices = before !== undefined ? extractServiceNames(before) : new Set<string>();
  return [...afterServices].filter((name) => !beforeServices.has(name));
}
