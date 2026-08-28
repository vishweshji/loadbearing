import { asRecord, parseYamlDocuments } from "../../shared/parseYamlDocuments.js";

const WORKLOAD_KINDS = new Set(["Deployment", "StatefulSet", "DaemonSet", "CronJob", "Job"]);

export interface KubernetesWorkloadRef {
  kind: string;
  name: string;
}

function extractWorkloads(content: string): KubernetesWorkloadRef[] {
  const refs: KubernetesWorkloadRef[] = [];

  for (const doc of parseYamlDocuments(content)) {
    const obj = asRecord(doc);
    const kind = typeof obj.kind === "string" ? obj.kind : undefined;
    const apiVersion = typeof obj.apiVersion === "string" ? obj.apiVersion : undefined;
    if (kind === undefined || apiVersion === undefined || !WORKLOAD_KINDS.has(kind)) continue;

    const metadata = asRecord(obj.metadata);
    const name = typeof metadata.name === "string" ? metadata.name : "(unnamed)";
    refs.push({ kind, name });
  }

  return refs;
}

export function findNewKubernetesWorkloads(
  before: string | undefined,
  after: string,
): KubernetesWorkloadRef[] {
  const afterRefs = extractWorkloads(after);
  const beforeRefs = before !== undefined ? extractWorkloads(before) : [];
  const beforeKeys = new Set(beforeRefs.map((r) => `${r.kind}/${r.name}`));
  return afterRefs.filter((r) => !beforeKeys.has(`${r.kind}/${r.name}`));
}
