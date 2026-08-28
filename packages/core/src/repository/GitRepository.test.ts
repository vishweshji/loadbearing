import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { RepositoryError } from "../errors.js";
import { GitRepository } from "./GitRepository.js";

let dir: string;

function git(cwd: string, args: string[]): string {
  return execFileSync(
    "git",
    ["-c", "user.email=test@example.com", "-c", "user.name=test", ...args],
    {
      cwd,
      encoding: "utf8",
    },
  ).trim();
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "loadbearing-git-"));
  git(dir, ["init", "--initial-branch=main"]);
  writeFileSync(join(dir, "shared.txt"), "line one\nline two\nline three\nline four\nline five\n");
  git(dir, ["add", "."]);
  git(dir, ["commit", "-m", "initial commit"]);
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("GitRepository", () => {
  it("resolves base/head revisions to concrete SHAs, using merge-base for the diff base", async () => {
    git(dir, ["checkout", "-b", "feature"]);
    writeFileSync(join(dir, "feature.txt"), "new stuff\n");
    git(dir, ["add", "."]);
    git(dir, ["commit", "-m", "add feature file"]);

    const repo = await GitRepository.create(dir, "main", "feature");
    const headSha = git(dir, ["rev-parse", "feature"]);
    const mergeBaseSha = git(dir, ["merge-base", "main", "feature"]);

    expect(repo.headRevision).toBe(headSha);
    expect(repo.baseRevision).toBe(mergeBaseSha);
  });

  it("does not attribute changes merged into base after the branch diverged (three-dot semantics)", async () => {
    git(dir, ["checkout", "-b", "feature"]);
    writeFileSync(join(dir, "feature.txt"), "new stuff\n");
    git(dir, ["add", "."]);
    git(dir, ["commit", "-m", "add feature file"]);

    git(dir, ["checkout", "main"]);
    writeFileSync(join(dir, "unrelated.txt"), "unrelated main-branch work\n");
    git(dir, ["add", "."]);
    git(dir, ["commit", "-m", "unrelated change landed on main after branch point"]);

    const repo = await GitRepository.create(dir, "main", "feature");
    const files = await repo.changedFiles();
    const paths = files.map((f) => f.path);

    expect(paths).toContain("feature.txt");
    expect(paths).not.toContain("unrelated.txt");
  });

  it("reports added, modified, deleted and renamed files", async () => {
    writeFileSync(join(dir, "to-delete.txt"), "will be deleted\n");
    git(dir, ["add", "."]);
    git(dir, ["commit", "-m", "add file that will be deleted on the branch"]);

    git(dir, ["checkout", "-b", "feature"]);
    writeFileSync(join(dir, "added.txt"), "added\n");
    writeFileSync(
      join(dir, "shared.txt"),
      "line one\nline two, modified\nline three\nline four\nline five\n",
    );
    git(dir, ["add", "added.txt", "shared.txt"]);
    git(dir, ["mv", "shared.txt", "renamed-away.txt"]);
    git(dir, ["rm", "to-delete.txt"]);
    git(dir, ["add", "."]);
    git(dir, ["commit", "-m", "add, rename+modify, and delete files"]);

    const repo = await GitRepository.create(dir, "main", "feature");
    const files = await repo.changedFiles();

    const added = files.find((f) => f.path === "added.txt");
    expect(added?.status).toBe("added");
    expect(added?.after).toBe("added\n");
    expect(added?.before).toBeUndefined();

    const deleted = files.find((f) => f.path === "to-delete.txt");
    expect(deleted?.status).toBe("deleted");
    expect(deleted?.before).toBe("will be deleted\n");
    expect(deleted?.after).toBeUndefined();

    const renamed = files.find((f) => f.path === "renamed-away.txt");
    expect(renamed?.status).toBe("renamed");
    expect(renamed?.previousPath).toBe("shared.txt");
    expect(renamed?.before).toBe("line one\nline two\nline three\nline four\nline five\n");
    expect(renamed?.after).toBe("line one\nline two, modified\nline three\nline four\nline five\n");
  });

  it("detects binary content and does not return it as text", async () => {
    git(dir, ["checkout", "-b", "feature"]);
    writeFileSync(join(dir, "binary.bin"), Buffer.from([0, 1, 2, 3, 0, 255]));
    git(dir, ["add", "."]);
    git(dir, ["commit", "-m", "add binary file"]);

    const repo = await GitRepository.create(dir, "main", "feature");
    const files = await repo.changedFiles();
    const binaryFile = files.find((f) => f.path === "binary.bin");

    expect(binaryFile?.binary).toBe(true);
    expect(binaryFile?.after).toBeUndefined();
  });

  it("marks a file truncated when it exceeds maxFileBytes, without returning partial content", async () => {
    git(dir, ["checkout", "-b", "feature"]);
    writeFileSync(join(dir, "big.txt"), "x".repeat(100));
    git(dir, ["add", "."]);
    git(dir, ["commit", "-m", "add big file"]);

    const repo = await GitRepository.create(dir, "main", "feature", { maxFileBytes: 10 });
    const files = await repo.changedFiles();
    const bigFile = files.find((f) => f.path === "big.txt");

    expect(bigFile?.truncated).toBe(true);
    expect(bigFile?.after).toBeUndefined();
  });

  it("throws a RepositoryError with actionable guidance when there is no common ancestor", async () => {
    const otherDir = mkdtempSync(join(tmpdir(), "loadbearing-git-other-"));
    try {
      git(otherDir, ["init", "--initial-branch=main"]);
      writeFileSync(join(otherDir, "file.txt"), "content\n");
      git(otherDir, ["add", "."]);
      git(otherDir, ["commit", "-m", "unrelated history"]);

      git(dir, ["remote", "add", "other", otherDir]);
      git(dir, ["fetch", "other"]);

      await expect(GitRepository.create(dir, "main", "other/main")).rejects.toThrow(
        RepositoryError,
      );
    } finally {
      rmSync(otherDir, { recursive: true, force: true });
    }
  });

  it("readAt and existsAt reflect content at an arbitrary revision", async () => {
    git(dir, ["checkout", "-b", "feature"]);
    writeFileSync(join(dir, "feature.txt"), "new stuff\n");
    git(dir, ["add", "."]);
    git(dir, ["commit", "-m", "add feature file"]);

    const repo = await GitRepository.create(dir, "main", "feature");
    expect(await repo.existsAt(repo.headRevision, "feature.txt")).toBe(true);
    expect(await repo.existsAt(repo.baseRevision, "feature.txt")).toBe(false);
    expect(await repo.readAt(repo.headRevision, "feature.txt")).toBe("new stuff\n");
  });

  it("rejects path traversal attempts rather than escaping the repository", async () => {
    const repo = await GitRepository.create(dir, "main", "main");
    expect(await repo.existsAt(repo.headRevision, "../../etc/passwd")).toBe(false);
    expect(await repo.readAt(repo.headRevision, "../../etc/passwd")).toBeUndefined();
  });
});
