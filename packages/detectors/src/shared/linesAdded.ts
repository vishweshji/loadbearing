export function linesAdded(before: string | undefined, after: string): string[] {
  if (before === undefined) return after.split(/\r?\n/);
  const beforeLines = new Set(before.split(/\r?\n/));
  return after.split(/\r?\n/).filter((line) => !beforeLines.has(line));
}
