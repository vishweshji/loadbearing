import { basename } from "node:path";
import { parse } from "yaml";
import { asRecord } from "../../shared/parseYamlDocuments.js";

export function isServerlessPath(path: string): boolean {
  const name = basename(path);
  return name === "serverless.yml" || name === "serverless.yaml";
}

function extractFunctionNames(content: string): Set<string> {
  try {
    const doc = parse(content, { strict: false });
    const functions = asRecord(doc).functions;
    return new Set(Object.keys(asRecord(functions)));
  } catch {
    return new Set();
  }
}

export function findNewServerlessFunctions(before: string | undefined, after: string): string[] {
  const afterFns = extractFunctionNames(after);
  const beforeFns = before !== undefined ? extractFunctionNames(before) : new Set<string>();
  return [...afterFns].filter((name) => !beforeFns.has(name));
}
