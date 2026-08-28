import type { DetectorContext, DetectorDefinition, Finding, Severity } from "@loadbearing/core";
import { isAlembicPath, findAlembicSchemaChanges } from "./ecosystems/alembic.js";
import { isDjangoMigrationPath, findDjangoSchemaChanges } from "./ecosystems/django.js";
import {
  findPrismaSchemaChanges,
  isPrismaPath,
  type PrismaChangeKind,
} from "./ecosystems/prisma.js";
import { isRailsMigrationPath, findRailsSchemaChanges } from "./ecosystems/rails.js";
import { findSqlSchemaChanges, isSqlMigrationPath } from "./ecosystems/sql.js";

function structuralFinding(path: string, severity: Severity, evidenceDescription: string): Finding {
  return {
    detectorId: "LB002",
    category: "persistent-schema",
    severity,
    confidence: 1,
    title: "Persistent schema change",
    description: `Introduces persistent schema change: ${evidenceDescription}`,
    rationale:
      "Future application behavior and integrations may depend on this data model. Changing " +
      "its ownership or meaning later may require migration and coordination.",
    evidence: [{ file: path, kind: "schema-change", description: evidenceDescription }],
  };
}

const PRISMA_SEVERITY: Record<PrismaChangeKind, Severity> = {
  "new-model": "high",
  "new-enum": "high",
  "new-optional-field": "medium",
  "new-required-field": "high",
};

function prismaEvidence(change: {
  kind: PrismaChangeKind;
  blockName: string;
  fieldName?: string;
}): string {
  switch (change.kind) {
    case "new-model":
      return `new model ${change.blockName}`;
    case "new-enum":
      return `new enum ${change.blockName}`;
    case "new-optional-field":
      return `${change.blockName}.${change.fieldName} (optional)`;
    case "new-required-field":
      return `${change.blockName}.${change.fieldName} (required)`;
  }
}

export const LB002: DetectorDefinition = {
  id: "LB002",
  name: "Persistent Schema Change",
  description:
    "Detects changes that establish or materially alter persistent data structures: SQL " +
    "migrations, Prisma schemas, Django migrations, Alembic revisions, and Rails migrations.",
  defaultSeverity: "high",
  supportedFiles: [
    "migrations/**/*.sql",
    "db/migrations/**/*.sql",
    "schema.prisma",
    "**/*.prisma",
    "**/migrations/*.py",
    "**/versions/*.py",
    "db/migrate/**/*.rb",
  ],

  async detect(context: DetectorContext): Promise<Finding[]> {
    const findings: Finding[] = [];

    for (const file of context.changedFiles) {
      if (file.status === "deleted") continue;
      if (file.binary || file.truncated) continue;
      if (file.after === undefined) continue;

      if (isSqlMigrationPath(file.path)) {
        for (const change of findSqlSchemaChanges(file.before, file.after)) {
          findings.push(structuralFinding(file.path, "high", change.description));
        }
        continue;
      }

      if (isPrismaPath(file.path)) {
        for (const change of findPrismaSchemaChanges(file.before, file.after)) {
          findings.push(
            structuralFinding(file.path, PRISMA_SEVERITY[change.kind], prismaEvidence(change)),
          );
        }
        continue;
      }

      if (isDjangoMigrationPath(file.path)) {
        for (const change of findDjangoSchemaChanges(file.before, file.after)) {
          findings.push(structuralFinding(file.path, "high", change.description));
        }
        continue;
      }

      if (isAlembicPath(file.path)) {
        for (const change of findAlembicSchemaChanges(file.before, file.after)) {
          findings.push(structuralFinding(file.path, "high", change.description));
        }
        continue;
      }

      if (isRailsMigrationPath(file.path)) {
        for (const change of findRailsSchemaChanges(file.before, file.after)) {
          findings.push(structuralFinding(file.path, "high", change.description));
        }
        continue;
      }
    }

    return findings;
  },
};
