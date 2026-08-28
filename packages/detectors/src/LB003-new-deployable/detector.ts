import type { DetectorContext, DetectorDefinition, Evidence, Finding } from "@loadbearing/core";
import { findNewComposeServices, isComposePath } from "./ecosystems/compose.js";
import { isDockerfilePath } from "./ecosystems/dockerfile.js";
import { findNewKubernetesWorkloads } from "./ecosystems/kubernetes.js";
import { findNewServerlessFunctions, isServerlessPath } from "./ecosystems/serverless.js";

function isYamlPath(path: string): boolean {
  return path.endsWith(".yml") || path.endsWith(".yaml");
}

export const LB003: DetectorDefinition = {
  id: "LB003",
  name: "New Deployable",
  description:
    "Detects creation of a new independently deployed or scheduled runtime unit: a Kubernetes " +
    "Deployment/StatefulSet/DaemonSet/CronJob/Job, a Docker Compose service, or a Serverless " +
    "Framework function. A newly added Dockerfile alone is not flagged — it's included as " +
    "supporting evidence only when a new workload also appears in the same change.",
  defaultSeverity: "high",
  supportedFiles: ["**/*.yml", "**/*.yaml", "docker-compose.yml", "serverless.yml", "Dockerfile"],

  async detect(context: DetectorContext): Promise<Finding[]> {
    const findings: Finding[] = [];

    const dockerfileEvidence: Evidence[] = context.changedFiles
      .filter((f) => f.status === "added" && isDockerfilePath(f.path))
      .map((f) => ({
        file: f.path,
        kind: "file-added",
        description: "New Dockerfile added in the same change",
      }));

    for (const file of context.changedFiles) {
      if (file.status === "deleted") continue;
      if (file.binary || file.truncated) continue;
      if (file.after === undefined) continue;

      if (isYamlPath(file.path)) {
        for (const workload of findNewKubernetesWorkloads(file.before, file.after)) {
          findings.push({
            detectorId: "LB003",
            category: "new-deployable",
            severity: "high",
            confidence: 1,
            title: "New deployable workload",
            description: `Introduces new Kubernetes ${workload.kind}: ${workload.name}`,
            rationale:
              "This creates a new independently deployed or scheduled runtime unit that must " +
              "be operated, monitored, and maintained.",
            evidence: [
              {
                file: file.path,
                kind: "resource-change",
                description: `${workload.kind} ${workload.name}`,
              },
              ...dockerfileEvidence,
            ],
          });
        }
      }

      if (isComposePath(file.path)) {
        for (const service of findNewComposeServices(file.before, file.after)) {
          findings.push({
            detectorId: "LB003",
            category: "new-deployable",
            severity: "high",
            confidence: 1,
            title: "New deployable workload",
            description: `Introduces new Docker Compose service: ${service}`,
            rationale:
              "This creates a new independently deployed runtime unit that must be operated, " +
              "monitored, and maintained.",
            evidence: [
              { file: file.path, kind: "resource-change", description: `service: ${service}` },
              ...dockerfileEvidence,
            ],
          });
        }
      }

      if (isServerlessPath(file.path)) {
        for (const fn of findNewServerlessFunctions(file.before, file.after)) {
          findings.push({
            detectorId: "LB003",
            category: "new-deployable",
            severity: "medium",
            confidence: 1,
            title: "New deployable function",
            description: `Introduces new Serverless function: ${fn}`,
            rationale:
              "This creates a new independently scheduled/invoked runtime unit that must be " +
              "operated, monitored, and maintained.",
            evidence: [
              { file: file.path, kind: "resource-change", description: `function: ${fn}` },
            ],
          });
        }
      }
    }

    return findings;
  },
};
