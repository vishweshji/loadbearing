import { parse as parseToml } from "smol-toml";
import type { Severity } from "@loadbearing/core";

const SECTION_SEVERITY = {
  dependencies: "medium",
  "build-dependencies": "medium",
  "dev-dependencies": "low",
} as const satisfies Record<string, Severity>;

type Section = keyof typeof SECTION_SEVERITY;

export interface DependencyChange {
  name: string;
  severity: Severity;
  sectionLabel: string;
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

export function findNewCargoDependencies(
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
  for (const section of Object.keys(SECTION_SEVERITY) as Section[]) {
    const afterDeps = asRecord(afterDoc[section]);
    const beforeDeps = asRecord(beforeDoc[section]);
    for (const name of Object.keys(afterDeps)) {
      if (!(name in beforeDeps)) {
        changes.push({ name, severity: SECTION_SEVERITY[section], sectionLabel: section });
      }
    }
  }
  return changes;
}
