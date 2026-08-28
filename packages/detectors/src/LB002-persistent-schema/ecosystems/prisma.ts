interface PrismaField {
  name: string;
  optional: boolean;
}

interface PrismaBlock {
  kind: "model" | "enum";
  name: string;
  fields: PrismaField[];
}

function parseBlocks(content: string): Map<string, PrismaBlock> {
  const blocks = new Map<string, PrismaBlock>();
  const blockRe = /\b(model|enum)\s+(\w+)\s*\{([^}]*)\}/g;
  let blockMatch: RegExpExecArray | null;

  while ((blockMatch = blockRe.exec(content)) !== null) {
    const kind = blockMatch[1] as "model" | "enum";
    const name = blockMatch[2] ?? "";
    const body = blockMatch[3] ?? "";
    const fields: PrismaField[] = [];

    for (const rawLine of body.split("\n")) {
      const line = rawLine.trim();
      if (line.length === 0 || line.startsWith("//") || line.startsWith("@@")) continue;
      const fieldMatch = /^(\w+)\s+(\S+)/.exec(line);
      if (!fieldMatch) continue;
      const fieldName = fieldMatch[1] ?? "";
      const fieldType = fieldMatch[2] ?? "";
      fields.push({ name: fieldName, optional: fieldType.endsWith("?") });
    }

    blocks.set(`${kind}:${name}`, { kind, name, fields });
  }

  return blocks;
}

export function isPrismaPath(path: string): boolean {
  return path === "schema.prisma" || path.endsWith(".prisma");
}

export type PrismaChangeKind =
  "new-model" | "new-enum" | "new-optional-field" | "new-required-field";

export interface PrismaChange {
  kind: PrismaChangeKind;
  blockName: string;
  fieldName?: string;
}

export function findPrismaSchemaChanges(before: string | undefined, after: string): PrismaChange[] {
  const afterBlocks = parseBlocks(after);
  const beforeBlocks = before !== undefined ? parseBlocks(before) : new Map<string, PrismaBlock>();

  const changes: PrismaChange[] = [];
  for (const [key, block] of afterBlocks) {
    const beforeBlock = beforeBlocks.get(key);
    if (beforeBlock === undefined) {
      changes.push({
        kind: block.kind === "model" ? "new-model" : "new-enum",
        blockName: block.name,
      });
      continue;
    }

    const beforeFieldNames = new Set(beforeBlock.fields.map((f) => f.name));
    for (const field of block.fields) {
      if (!beforeFieldNames.has(field.name)) {
        changes.push({
          kind: field.optional ? "new-optional-field" : "new-required-field",
          blockName: block.name,
          fieldName: field.name,
        });
      }
    }
  }

  return changes;
}
