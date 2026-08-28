import { minimatch } from "minimatch";
import { linesAdded } from "../../shared/linesAdded.js";
import {
  scanConstructs,
  type ConstructMatch,
  type ConstructPattern,
} from "../../shared/scanConstructs.js";

const MIGRATION_PATH_GLOBS = [
  "migrations/**",
  "db/migrations/**",
  "database/migrations/**",
  "schema/migrations/**",
];

const PATTERNS: ConstructPattern[] = [
  {
    re: /\bCREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["'`]?([A-Za-z_][\w.]*)["'`]?/i,
    describe: (m) => `CREATE TABLE ${m[1]}`,
  },
  {
    re: /\bALTER\s+TABLE\s+["'`]?([A-Za-z_][\w.]*)["'`]?\s+ADD\s+COLUMN\s+["'`]?([A-Za-z_]\w*)["'`]?/i,
    describe: (m) => `ALTER TABLE ${m[1]} ADD COLUMN ${m[2]}`,
  },
  {
    re: /\bCREATE\s+TYPE\s+["'`]?([A-Za-z_][\w.]*)["'`]?/i,
    describe: (m) => `CREATE TYPE ${m[1]}`,
  },
  {
    re: /\bCREATE\s+(?:UNIQUE\s+)?INDEX\s+["'`]?([A-Za-z_]\w*)["'`]?/i,
    describe: (m) => `CREATE INDEX ${m[1]}`,
  },
  {
    re: /\bALTER\s+TABLE\s+["'`]?([A-Za-z_][\w.]*)["'`]?\s+ADD\s+CONSTRAINT\s+["'`]?([A-Za-z_]\w*)["'`]?/i,
    describe: (m) => `ALTER TABLE ${m[1]} ADD CONSTRAINT ${m[2]}`,
  },
];

export function isSqlMigrationPath(path: string): boolean {
  if (!path.toLowerCase().endsWith(".sql")) return false;
  return MIGRATION_PATH_GLOBS.some((glob) => minimatch(path, glob));
}

export function findSqlSchemaChanges(before: string | undefined, after: string): ConstructMatch[] {
  const added = linesAdded(before, after);
  return scanConstructs(added, PATTERNS);
}
