import {
  findNewKubernetesObjects,
  type KubernetesObjectRef,
} from "../../shared/kubernetesObjects.js";

const INFRA_KINDS = new Set([
  "Service",
  "Ingress",
  "PersistentVolume",
  "PersistentVolumeClaim",
  "NetworkPolicy",
  "Role",
  "ClusterRole",
  "RoleBinding",
  "ClusterRoleBinding",
]);

export type { KubernetesObjectRef as KubernetesInfraRef };

export function findNewKubernetesInfraObjects(
  before: string | undefined,
  after: string,
): KubernetesObjectRef[] {
  return findNewKubernetesObjects(before, after, INFRA_KINDS);
}
