import { basename, dirname } from "node:path";
import { linesAdded } from "../../shared/linesAdded.js";
import {
  scanConstructs,
  type ConstructMatch,
  type ConstructPattern,
} from "../../shared/scanConstructs.js";

const PATTERNS: ConstructPattern[] = [
  {
    re: /\bmigrations\.CreateModel\s*\(\s*(?:name\s*=\s*)?["']([^"']+)["']/,
    describe: (m) => `migrations.CreateModel("${m[1]}")`,
  },
  {
    re: /\bmigrations\.AddField\s*\(\s*(?:model_name\s*=\s*)?["']([^"']+)["']\s*,\s*(?:name\s*=\s*)?["']([^"']+)["']/,
    describe: (m) => `migrations.AddField("${m[1]}", "${m[2]}")`,
  },
  {
    re: /\bmigrations\.AlterField\s*\(\s*(?:model_name\s*=\s*)?["']([^"']+)["']\s*,\s*(?:name\s*=\s*)?["']([^"']+)["']/,
    describe: (m) => `migrations.AlterField("${m[1]}", "${m[2]}")`,
  },
];

export function isDjangoMigrationPath(path: string): boolean {
  return basename(dirname(path)) === "migrations" && path.endsWith(".py");
}

export function findDjangoSchemaChanges(
  before: string | undefined,
  after: string,
): ConstructMatch[] {
  return scanConstructs(linesAdded(before, after), PATTERNS);
}
