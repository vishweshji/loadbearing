import { parseAllDocuments } from "yaml";

export function parseYamlDocuments(content: string): unknown[] {
  try {
    return parseAllDocuments(content, { strict: false })
      .map((doc) => doc.toJS())
      .filter((value) => value !== null && value !== undefined);
  } catch {
    return [];
  }
}

export function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}
