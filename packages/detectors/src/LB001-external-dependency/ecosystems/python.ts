import { parse as parseToml } from "smol-toml";
import type { Severity } from "@loadbearing/core";

export interface DependencyChange {
  name: string;
  severity: Severity;
  sectionLabel: string;
}

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[-_.]+/g, "-");
}

function extractRequirementNames(content: string): Set<string> {
  const names = new Set<string>();
  for (const rawLine of content.split(/\r?\n/)) {
    const line = (rawLine.split("#")[0] ?? "").trim();
    if (line.length === 0 || line.startsWith("-")) continue;
    const match = /^([A-Za-z0-9_.-]+)/.exec(line);
    if (match?.[1]) names.add(normalizeName(match[1]));
  }
  return names;
}

export function findNewRequirementsDependencies(
  before: string | undefined,
  after: string,
  filename: string,
): DependencyChange[] {
  const afterNames = extractRequirementNames(after);
  const beforeNames = before !== undefined ? extractRequirementNames(before) : new Set<string>();
  const isDev = filename !== "requirements.txt";
  const severity: Severity = isDev ? "low" : "medium";

  return [...afterNames]
    .filter((name) => !beforeNames.has(name))
    .map((name) => ({ name, severity, sectionLabel: filename }));
}

function extractPep508Names(list: unknown): Set<string> {
  const names = new Set<string>();
  if (!Array.isArray(list)) return names;
  for (const entry of list) {
    if (typeof entry !== "string") continue;
    const match = /^([A-Za-z0-9_.-]+)/.exec(entry);
    if (match?.[1]) names.add(normalizeName(match[1]));
  }
  return names;
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

export function findNewPyprojectDependencies(
  before: string | undefined,
  after: string,
): DependencyChange[] | undefined {
  let afterDoc: Record<string, unknown>;
  let beforeDoc: Record<string, unknown>;
  try {
    afterDoc = parseToml(after) as Record<string, unknown>;
    beforeDoc = before !== undefined ? (parseToml(before) as Record<string, unknown>) : {};
  } catch {
    return undefined;
  }

  const changes: DependencyChange[] = [];

  const afterProject = asRecord(afterDoc.project);
  const beforeProject = asRecord(beforeDoc.project);

  const afterDeps = extractPep508Names(afterProject.dependencies);
  const beforeDeps = extractPep508Names(beforeProject.dependencies);
  for (const name of afterDeps) {
    if (!beforeDeps.has(name)) {
      changes.push({ name, severity: "medium", sectionLabel: "project.dependencies" });
    }
  }

  const afterOptional = asRecord(afterProject["optional-dependencies"]);
  const beforeOptional = asRecord(beforeProject["optional-dependencies"]);
  for (const [group, list] of Object.entries(afterOptional)) {
    const afterNames = extractPep508Names(list);
    const beforeNames = extractPep508Names(beforeOptional[group]);
    for (const name of afterNames) {
      if (!beforeNames.has(name)) {
        changes.push({
          name,
          severity: "medium",
          sectionLabel: `project.optional-dependencies.${group}`,
        });
      }
    }
  }

  const afterPoetry = asRecord(asRecord(afterDoc.tool).poetry);
  const beforePoetry = asRecord(asRecord(beforeDoc.tool).poetry);
  const afterPoetryDeps = asRecord(afterPoetry.dependencies);
  const beforePoetryDeps = asRecord(beforePoetry.dependencies);
  for (const name of Object.keys(afterPoetryDeps)) {
    if (name === "python") continue;
    if (!(name in beforePoetryDeps)) {
      changes.push({ name, severity: "medium", sectionLabel: "tool.poetry.dependencies" });
    }
  }

  const afterGroups = asRecord(afterPoetry.group);
  const beforeGroups = asRecord(beforePoetry.group);
  for (const [groupName, groupTable] of Object.entries(afterGroups)) {
    const afterGroupDeps = asRecord(asRecord(groupTable).dependencies);
    const beforeGroupDeps = asRecord(asRecord(beforeGroups[groupName]).dependencies);
    for (const name of Object.keys(afterGroupDeps)) {
      if (!(name in beforeGroupDeps)) {
        changes.push({
          name,
          severity: "low",
          sectionLabel: `tool.poetry.group.${groupName}.dependencies`,
        });
      }
    }
  }

  return changes;
}
