import {
  findNewKubernetesObjects,
  type KubernetesObjectRef,
} from "../../shared/kubernetesObjects.js";

const WORKLOAD_KINDS = new Set(["Deployment", "StatefulSet", "DaemonSet", "CronJob", "Job"]);

export type { KubernetesObjectRef as KubernetesWorkloadRef };

export function findNewKubernetesWorkloads(
  before: string | undefined,
  after: string,
): KubernetesObjectRef[] {
  return findNewKubernetesObjects(before, after, WORKLOAD_KINDS);
}
