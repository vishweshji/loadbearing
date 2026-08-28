import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DirectoryRepository } from "./DirectoryRepository.js";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "loadbearing-dirrepo-"));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("DirectoryRepository", () => {
  it("preserves nested subdirectory paths (regression: walk() previously computed paths relative to each recursion level instead of the tree root)", async () => {
    const before = join(dir, "before");
    const after = join(dir, "after");
    mkdirSync(join(after, "deploy", "nested"), { recursive: true });
    writeFileSync(join(after, "deploy", "nested", "service.yaml"), "kind: Deployment\n");

    const repo = new DirectoryRepository(before, after);
    const files = await repo.changedFiles();

    expect(files).toHaveLength(1);
    expect(files[0]?.path).toBe("deploy/nested/service.yaml");
    expect(files[0]?.status).toBe("added");
  });

  it("detects added, modified, and deleted files", async () => {
    const before = join(dir, "before");
    const after = join(dir, "after");
    mkdirSync(before, { recursive: true });
    mkdirSync(after, { recursive: true });

    writeFileSync(join(before, "unchanged.txt"), "same\n");
    writeFileSync(join(after, "unchanged.txt"), "same\n");

    writeFileSync(join(before, "modified.txt"), "old\n");
    writeFileSync(join(after, "modified.txt"), "new\n");

    writeFileSync(join(before, "removed.txt"), "gone\n");

    writeFileSync(join(after, "new.txt"), "fresh\n");

    const repo = new DirectoryRepository(before, after);
    const files = await repo.changedFiles();
    const byPath = new Map(files.map((f) => [f.path, f]));

    expect(byPath.has("unchanged.txt")).toBe(false);
    expect(byPath.get("modified.txt")?.status).toBe("modified");
    expect(byPath.get("removed.txt")?.status).toBe("deleted");
    expect(byPath.get("new.txt")?.status).toBe("added");
  });

  it("handles a missing before directory as an empty tree", async () => {
    const before = join(dir, "before-does-not-exist");
    const after = join(dir, "after");
    mkdirSync(after, { recursive: true });
    writeFileSync(join(after, "file.txt"), "content\n");

    const repo = new DirectoryRepository(before, after);
    const files = await repo.changedFiles();

    expect(files).toHaveLength(1);
    expect(files[0]?.status).toBe("added");
  });
});
