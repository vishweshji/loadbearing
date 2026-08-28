import type { DetectorContext, DetectorDefinition, Finding } from "@loadbearing/core";
import {
  findNewCloudFormationResources,
  isCloudFormationDocument,
} from "./ecosystems/cloudformation.js";
import { findNewKubernetesInfraObjects } from "./ecosystems/kubernetesInfra.js";
import { findNewTerraformResources, isTerraformPath } from "./ecosystems/terraform.js";

function infraFinding(path: string, description: string): Finding {
  return {
    detectorId: "LB005",
    category: "infrastructure-resource",
    severity: "high",
    confidence: 1,
    title: "New infrastructure resource",
    description: `Introduces new infrastructure resource: ${description}`,
    rationale:
      "This provisions persistent or operational infrastructure outside the application " +
      "itself, which typically has its own lifecycle, cost, and operational ownership.",
    evidence: [{ file: path, kind: "resource-change", description }],
  };
}

function isYamlOrJsonPath(path: string): boolean {
  return path.endsWith(".yaml") || path.endsWith(".yml") || path.endsWith(".json");
}

export const LB005: DetectorDefinition = {
  id: "LB005",
  name: "Infrastructure Resource",
  description:
    "Detects introduction of persistent or operational infrastructure: Terraform resources, " +
    "Kubernetes infrastructure objects (Service, Ingress, PersistentVolume(Claim), " +
    "NetworkPolicy, Role(Binding), ClusterRole(Binding)), and CloudFormation/SAM resources.",
  defaultSeverity: "high",
  supportedFiles: ["**/*.tf", "**/*.yaml", "**/*.yml", "**/*.json"],

  async detect(context: DetectorContext): Promise<Finding[]> {
    const findings: Finding[] = [];

    for (const file of context.changedFiles) {
      if (file.status === "deleted") continue;
      if (file.binary || file.truncated) continue;
      if (file.after === undefined) continue;

      if (isTerraformPath(file.path)) {
        for (const resource of findNewTerraformResources(file.before, file.after)) {
          findings.push(infraFinding(file.path, `${resource.type}.${resource.name}`));
        }
        continue;
      }

      if (file.path.endsWith(".yaml") || file.path.endsWith(".yml")) {
        for (const object of findNewKubernetesInfraObjects(file.before, file.after)) {
          findings.push(infraFinding(file.path, `${object.kind} ${object.name}`));
        }
      }

      if (isYamlOrJsonPath(file.path) && isCloudFormationDocument(file.path, file.after)) {
        const changes = findNewCloudFormationResources(file.before, file.after, file.path);
        if (changes === undefined) continue;
        for (const resource of changes) {
          findings.push(infraFinding(file.path, `${resource.logicalId} (${resource.type})`));
        }
      }
    }

    return findings;
  },
};
