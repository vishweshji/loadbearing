import { extractBraceBlocks } from "../../shared/braceBlocks.js";

const CONSTRUCTS = ["service", "message", "enum"];

export function isProtoPath(path: string): boolean {
  return path.endsWith(".proto");
}

export type ProtoChangeKind = "new" | "changed";

export interface ProtoChange {
  kind: ProtoChangeKind;
  constructKind: string;
  name: string;
}

export function findProtoChanges(before: string | undefined, after: string): ProtoChange[] {
  const afterBlocks = extractBraceBlocks(after, CONSTRUCTS);
  const beforeBlocks = before !== undefined ? extractBraceBlocks(before, CONSTRUCTS) : [];
  const beforeByKey = new Map(beforeBlocks.map((b) => [`${b.kind}:${b.name}`, b.body]));

  const changes: ProtoChange[] = [];
  for (const block of afterBlocks) {
    const beforeBody = beforeByKey.get(`${block.kind}:${block.name}`);
    if (beforeBody === undefined) {
      changes.push({ kind: "new", constructKind: block.kind, name: block.name });
    } else if (beforeBody.trim() !== block.body.trim()) {
      changes.push({ kind: "changed", constructKind: block.kind, name: block.name });
    }
  }
  return changes;
}
