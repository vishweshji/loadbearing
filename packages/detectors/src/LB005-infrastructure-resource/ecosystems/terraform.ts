export function isTerraformPath(path: string): boolean {
  return path.endsWith(".tf");
}

export interface TerraformResourceRef {
  type: string;
  name: string;
}

function extractResources(content: string): TerraformResourceRef[] {
  const refs: TerraformResourceRef[] = [];
  const re = /\bresource\s+"([^"]+)"\s+"([^"]+)"\s*\{/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(content)) !== null) {
    refs.push({ type: match[1] ?? "", name: match[2] ?? "" });
  }
  return refs;
}

export function findNewTerraformResources(
  before: string | undefined,
  after: string,
): TerraformResourceRef[] {
  const afterRefs = extractResources(after);
  const beforeRefs = before !== undefined ? extractResources(before) : [];
  const beforeKeys = new Set(beforeRefs.map((r) => `${r.type}.${r.name}`));
  return afterRefs.filter((r) => !beforeKeys.has(`${r.type}.${r.name}`));
}
