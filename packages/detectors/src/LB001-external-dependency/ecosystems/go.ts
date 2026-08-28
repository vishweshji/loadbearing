export interface DependencyChange {
  name: string;
}

function extractRequiredModules(content: string): Set<string> {
  const modules = new Set<string>();

  const blockMatch = /require\s*\(([^)]*)\)/s.exec(content);
  if (blockMatch?.[1]) {
    for (const rawLine of blockMatch[1].split("\n")) {
      const line = (rawLine.split("//")[0] ?? "").trim();
      if (line.length === 0) continue;
      const match = /^(\S+)\s+(\S+)/.exec(line);
      if (match?.[1]) modules.add(match[1]);
    }
  }

  for (const rawLine of content.split("\n")) {
    const line = (rawLine.split("//")[0] ?? "").trim();
    const match = /^require\s+(\S+)\s+(\S+)$/.exec(line);
    if (match?.[1]) modules.add(match[1]);
  }

  return modules;
}

export function findNewGoModRequirements(
  before: string | undefined,
  after: string,
): DependencyChange[] {
  const afterModules = extractRequiredModules(after);
  const beforeModules = before !== undefined ? extractRequiredModules(before) : new Set<string>();

  return [...afterModules].filter((name) => !beforeModules.has(name)).map((name) => ({ name }));
}
