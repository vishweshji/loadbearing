import { extractBraceBlocks } from "../../shared/braceBlocks.js";

const BRACE_CONSTRUCTS = ["type", "input", "interface", "enum"];

export function isGraphqlPath(path: string): boolean {
  return (
    path === "schema.graphql" ||
    path === "schema.graphqls" ||
    path.endsWith(".graphql") ||
    path.endsWith(".graphqls")
  );
}

export type GraphqlChangeKind = "new" | "changed";

export interface GraphqlChange {
  kind: GraphqlChangeKind;
  constructKind: string;
  name: string;
}

function extractUnions(content: string): Map<string, string> {
  const unions = new Map<string, string>();
  const re = /\bunion\s+(\w+)\s*=\s*([^\n]+)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(content)) !== null) {
    const name = match[1] ?? "";
    unions.set(name, (match[2] ?? "").trim());
  }
  return unions;
}

export function findGraphqlChanges(before: string | undefined, after: string): GraphqlChange[] {
  const afterBlocks = extractBraceBlocks(after, BRACE_CONSTRUCTS);
  const beforeBlocks = before !== undefined ? extractBraceBlocks(before, BRACE_CONSTRUCTS) : [];
  const beforeByKey = new Map(beforeBlocks.map((b) => [`${b.kind}:${b.name}`, b.body]));

  const changes: GraphqlChange[] = [];
  for (const block of afterBlocks) {
    const beforeBody = beforeByKey.get(`${block.kind}:${block.name}`);
    if (beforeBody === undefined) {
      changes.push({ kind: "new", constructKind: block.kind, name: block.name });
    } else if (beforeBody.trim() !== block.body.trim()) {
      changes.push({ kind: "changed", constructKind: block.kind, name: block.name });
    }
  }

  const afterUnions = extractUnions(after);
  const beforeUnions = before !== undefined ? extractUnions(before) : new Map<string, string>();
  for (const [name, members] of afterUnions) {
    const beforeMembers = beforeUnions.get(name);
    if (beforeMembers === undefined) {
      changes.push({ kind: "new", constructKind: "union", name });
    } else if (beforeMembers !== members) {
      changes.push({ kind: "changed", constructKind: "union", name });
    }
  }

  return changes;
}
