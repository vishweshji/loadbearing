export interface BraceBlock {
  kind: string;
  name: string;
  body: string;
}

export function extractBraceBlocks(content: string, keywords: string[]): BraceBlock[] {
  const blocks: BraceBlock[] = [];
  const keywordPattern = keywords.join("|");
  const re = new RegExp(`\\b(${keywordPattern})\\s+(\\w+)[^{]*\\{`, "g");
  let match: RegExpExecArray | null;

  while ((match = re.exec(content)) !== null) {
    const kind = match[1] ?? "";
    const name = match[2] ?? "";
    const bodyStart = re.lastIndex;
    let depth = 1;
    let i = bodyStart;
    while (i < content.length && depth > 0) {
      if (content[i] === "{") depth++;
      else if (content[i] === "}") depth--;
      i++;
    }
    blocks.push({ kind, name, body: content.slice(bodyStart, i - 1) });
    re.lastIndex = i;
  }

  return blocks;
}
