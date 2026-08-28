export interface ConstructPattern {
  re: RegExp;
  describe: (match: RegExpExecArray) => string;
}

export interface ConstructMatch {
  description: string;
}

export function scanConstructs(lines: string[], patterns: ConstructPattern[]): ConstructMatch[] {
  const content = lines.join("\n");
  const results: ConstructMatch[] = [];

  for (const pattern of patterns) {
    const flags = pattern.re.flags.includes("g") ? pattern.re.flags : `${pattern.re.flags}g`;
    const re = new RegExp(pattern.re.source, flags);
    let match: RegExpExecArray | null;
    while ((match = re.exec(content)) !== null) {
      results.push({ description: pattern.describe(match) });
      if (match[0].length === 0) re.lastIndex += 1;
    }
  }

  return results;
}
