import { basename } from "node:path";
import type { DetectorContext, DetectorDefinition, Finding, Severity } from "@loadbearing/core";
import { findNewGoModRequirements } from "./ecosystems/go.js";
import { findNewPackageJsonDependencies } from "./ecosystems/javascript.js";
import {
  findNewPyprojectDependencies,
  findNewRequirementsDependencies,
} from "./ecosystems/python.js";
import { findNewCargoDependencies } from "./ecosystems/rust.js";

function isRequirementsFile(name: string): boolean {
  return name === "requirements.txt" || /^requirements-.+\.txt$/.test(name);
}

function finding(
  path: string,
  name: string,
  severity: Severity,
  sectionLabel: string,
  version?: string,
): Finding {
  const isDev = severity === "low";
  const versionSuffix = version !== undefined ? `@${version}` : "";
  return {
    detectorId: "LB001",
    category: "external-dependency",
    severity,
    confidence: 1,
    title: "New external dependency",
    description: `Adds ${isDev ? "development" : "runtime"} dependency: ${name}${versionSuffix}`,
    rationale: isDev
      ? "New development dependencies can still introduce build-time or tooling coupling to an external library or ecosystem."
      : "New runtime dependencies can establish long-term coupling to an external library, API, or ecosystem.",
    evidence: [
      {
        file: path,
        kind: "manifest-change",
        description: `${sectionLabel}: ${name}${versionSuffix}`,
      },
    ],
  };
}

export const LB001: DetectorDefinition = {
  id: "LB001",
  name: "New External Dependency",
  description:
    "Detects newly introduced direct dependencies in package manifests (npm/pnpm/yarn " +
    "package.json, Python pyproject.toml/requirements*.txt, Go go.mod, Rust Cargo.toml). " +
    "A version bump on an existing dependency is not flagged.",
  defaultSeverity: "medium",
  supportedFiles: ["package.json", "pyproject.toml", "requirements*.txt", "go.mod", "Cargo.toml"],

  async detect(context: DetectorContext): Promise<Finding[]> {
    const findings: Finding[] = [];

    for (const file of context.changedFiles) {
      if (file.status === "deleted") continue;
      if (file.binary || file.truncated) continue;
      if (file.after === undefined) continue;

      const name = basename(file.path);

      if (name === "package.json") {
        const changes = findNewPackageJsonDependencies(file.before, file.after);
        if (changes === undefined) continue;
        for (const change of changes) {
          findings.push(
            finding(file.path, change.name, change.severity, change.sectionLabel, change.version),
          );
        }
        continue;
      }

      if (isRequirementsFile(name)) {
        const changes = findNewRequirementsDependencies(file.before, file.after, name);
        for (const change of changes) {
          findings.push(finding(file.path, change.name, change.severity, change.sectionLabel));
        }
        continue;
      }

      if (name === "pyproject.toml") {
        const changes = findNewPyprojectDependencies(file.before, file.after);
        if (changes === undefined) continue;
        for (const change of changes) {
          findings.push(finding(file.path, change.name, change.severity, change.sectionLabel));
        }
        continue;
      }

      if (name === "go.mod") {
        const changes = findNewGoModRequirements(file.before, file.after);
        for (const change of changes) {
          findings.push(finding(file.path, change.name, "medium", "require"));
        }
        continue;
      }

      if (name === "Cargo.toml") {
        const changes = findNewCargoDependencies(file.before, file.after);
        if (changes === undefined) continue;
        for (const change of changes) {
          findings.push(finding(file.path, change.name, change.severity, change.sectionLabel));
        }
        continue;
      }
    }

    return findings;
  },
};
