import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import type { ChangedFile, ChangedFileStatus, Repository } from "@loadbearing/core";

function isBinaryContent(buffer: Buffer): boolean {
  return buffer.includes(0);
}

function walk(root: string, dir: string = root): string[] {
  if (!existsSync(dir)) return [];
  const results: string[] = [];
  const entries = readdirSync(dir);
  for (const entry of entries) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      results.push(...walk(root, full));
    } else {
      results.push(relative(root, full));
    }
  }
  return results;
}

// A Repository implementation backed by two plain directories (a "before" and an "after" tree)
// instead of git history. Used by the golden-fixture runner so fixtures are just files on disk
// — no temporary git repository needs to be constructed per fixture.
export class DirectoryRepository implements Repository {
  readonly root: string;
  readonly baseRevision = "before";
  readonly headRevision = "after";

  constructor(
    private readonly beforeDir: string,
    private readonly afterDir: string,
  ) {
    this.root = afterDir;
  }

  private dirFor(revision: string): string {
    return revision === this.baseRevision ? this.beforeDir : this.afterDir;
  }

  async changedFiles(): Promise<ChangedFile[]> {
    const beforePaths = new Set(walk(this.beforeDir));
    const afterPaths = new Set(walk(this.afterDir));
    const allPaths = new Set([...beforePaths, ...afterPaths]);

    const files: ChangedFile[] = [];
    for (const path of allPaths) {
      const beforeExists = beforePaths.has(path);
      const afterExists = afterPaths.has(path);

      if (beforeExists && !afterExists) {
        const buffer = readFileSync(join(this.beforeDir, path));
        files.push(this.buildEntry(path, "deleted", buffer, undefined));
        continue;
      }
      if (!beforeExists && afterExists) {
        const buffer = readFileSync(join(this.afterDir, path));
        files.push(this.buildEntry(path, "added", undefined, buffer));
        continue;
      }

      const beforeBuffer = readFileSync(join(this.beforeDir, path));
      const afterBuffer = readFileSync(join(this.afterDir, path));
      if (!beforeBuffer.equals(afterBuffer)) {
        files.push(this.buildEntry(path, "modified", beforeBuffer, afterBuffer));
      }
    }
    return files;
  }

  async readAt(revision: string, path: string): Promise<string | undefined> {
    const full = join(this.dirFor(revision), path);
    if (!existsSync(full)) return undefined;
    return readFileSync(full, "utf8");
  }

  async existsAt(revision: string, path: string): Promise<boolean> {
    return existsSync(join(this.dirFor(revision), path));
  }

  private buildEntry(
    path: string,
    status: ChangedFileStatus,
    beforeBuffer: Buffer | undefined,
    afterBuffer: Buffer | undefined,
  ): ChangedFile {
    const binary =
      Boolean(beforeBuffer && isBinaryContent(beforeBuffer)) ||
      Boolean(afterBuffer && isBinaryContent(afterBuffer));

    return {
      path,
      status,
      binary,
      truncated: false,
      ...(beforeBuffer !== undefined && !binary ? { before: beforeBuffer.toString("utf8") } : {}),
      ...(afterBuffer !== undefined && !binary ? { after: afterBuffer.toString("utf8") } : {}),
    };
  }
}
