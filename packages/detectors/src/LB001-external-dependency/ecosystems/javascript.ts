import type { Severity } from "@loadbearing/core";

const SECTION_SEVERITY = {
  dependencies: "medium",
  optionalDependencies: "medium",
  peerDependencies: "medium",
  devDependencies: "low",
} as const satisfies Record<string, Severity>;

type Section = keyof typeof SECTION_SEVERITY;

interface PackageJsonShape {
  dependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

export interface DependencyChange {
  name: string;
  version: string;
  severity: Severity;
  sectionLabel: string;
}

function parse(content: string): PackageJsonShape | undefined {
  try {
    const value: unknown = JSON.parse(content);
    if (typeof value !== "object" || value === null) return undefined;
    return value as PackageJsonShape;
  } catch {
    return undefined;
  }
}

export function findNewPackageJsonDependencies(
  before: string | undefined,
  after: string,
): DependencyChange[] | undefined {
  const afterParsed = parse(after);
  if (afterParsed === undefined) return undefined;

  const beforeParsed = before !== undefined ? parse(before) : {};
  if (beforeParsed === undefined) return undefined;

  const changes: DependencyChange[] = [];
  for (const section of Object.keys(SECTION_SEVERITY) as Section[]) {
    const beforeDeps = beforeParsed[section] ?? {};
    const afterDeps = afterParsed[section] ?? {};
    for (const [name, version] of Object.entries(afterDeps)) {
      if (!(name in beforeDeps)) {
        changes.push({ name, version, severity: SECTION_SEVERITY[section], sectionLabel: section });
      }
    }
  }
  return changes;
}
