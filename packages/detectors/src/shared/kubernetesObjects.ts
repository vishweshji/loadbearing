import { asRecord, parseYamlDocuments } from "./parseYamlDocuments.js";

export interface KubernetesObjectRef {
  kind: string;
  name: string;
}

export function extractKubernetesObjects(
  content: string,
  kinds: ReadonlySet<string>,
): KubernetesObjectRef[] {
  const refs: KubernetesObjectRef[] = [];

  for (const doc of parseYamlDocuments(content)) {
    const obj = asRecord(doc);
    const kind = typeof obj.kind === "string" ? obj.kind : undefined;
    const apiVersion = typeof obj.apiVersion === "string" ? obj.apiVersion : undefined;
    if (kind === undefined || apiVersion === undefined || !kinds.has(kind)) continue;

    const metadata = asRecord(obj.metadata);
    const name = typeof metadata.name === "string" ? metadata.name : "(unnamed)";
    refs.push({ kind, name });
  }

  return refs;
}

export function findNewKubernetesObjects(
  before: string | undefined,
  after: string,
  kinds: ReadonlySet<string>,
): KubernetesObjectRef[] {
  const afterRefs = extractKubernetesObjects(after, kinds);
  const beforeRefs = before !== undefined ? extractKubernetesObjects(before, kinds) : [];
  const beforeKeys = new Set(beforeRefs.map((r) => `${r.kind}/${r.name}`));
  return afterRefs.filter((r) => !beforeKeys.has(`${r.kind}/${r.name}`));
}
