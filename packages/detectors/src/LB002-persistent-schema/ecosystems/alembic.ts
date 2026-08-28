import { linesAdded } from "../../shared/linesAdded.js";
import {
  scanConstructs,
  type ConstructMatch,
  type ConstructPattern,
} from "../../shared/scanConstructs.js";

const PATTERNS: ConstructPattern[] = [
  {
    re: /\bop\.create_table\s*\(\s*["']([^"']+)["']/,
    describe: (m) => `op.create_table("${m[1]}")`,
  },
  {
    re: /\bop\.add_column\s*\(\s*["']([^"']+)["']\s*,\s*sa\.Column\(\s*["']([^"']+)["']/,
    describe: (m) => `op.add_column("${m[1]}", "${m[2]}")`,
  },
  {
    re: /\bop\.alter_column\s*\(\s*["']([^"']+)["']\s*,\s*["']([^"']+)["']/,
    describe: (m) => `op.alter_column("${m[1]}", "${m[2]}")`,
  },
];

export function isAlembicPath(path: string): boolean {
  return path.endsWith(".py") && (path.includes("/alembic/") || path.includes("/versions/"));
}

export function findAlembicSchemaChanges(
  before: string | undefined,
  after: string,
): ConstructMatch[] {
  return scanConstructs(linesAdded(before, after), PATTERNS);
}
