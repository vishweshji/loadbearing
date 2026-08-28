import { linesAdded } from "../../shared/linesAdded.js";
import {
  scanConstructs,
  type ConstructMatch,
  type ConstructPattern,
} from "../../shared/scanConstructs.js";

const PATTERNS: ConstructPattern[] = [
  {
    re: /\bcreate_table\s+["':]([A-Za-z0-9_]+)/,
    describe: (m) => `create_table :${m[1]}`,
  },
  {
    re: /\badd_column\s+["':]([A-Za-z0-9_]+)["'],?\s*["':]([A-Za-z0-9_]+)/,
    describe: (m) => `add_column :${m[1]}, :${m[2]}`,
  },
  {
    re: /\bchange_column\s+["':]([A-Za-z0-9_]+)["'],?\s*["':]([A-Za-z0-9_]+)/,
    describe: (m) => `change_column :${m[1]}, :${m[2]}`,
  },
  {
    re: /\badd_reference\s+["':]([A-Za-z0-9_]+)["'],?\s*["':]([A-Za-z0-9_]+)/,
    describe: (m) => `add_reference :${m[1]}, :${m[2]}`,
  },
];

export function isRailsMigrationPath(path: string): boolean {
  return path.endsWith(".rb") && path.includes("/migrate/");
}

export function findRailsSchemaChanges(
  before: string | undefined,
  after: string,
): ConstructMatch[] {
  return scanConstructs(linesAdded(before, after), PATTERNS);
}
