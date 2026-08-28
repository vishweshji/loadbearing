import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { RepositoryError } from "../errors.js";
import { GitCatFileBatch } from "./catFileBatch.js";
import type { ChangedFile, ChangedFileStatus, Repository } from "./types.js";

const execFileAsync = promisify(execFile);

const MAX_BUFFER = 64 * 1024 * 1024;
const NUL = String.fromCharCode(0);

export interface GitRepositoryOptions {
  maxFileBytes?: number;
}

async function runGit(root: string, args: string[]): Promise<Buffer> {
  try {
    const { stdout } = await execFileAsync("git", args, {
      cwd: root,
      maxBuffer: MAX_BUFFER,
      encoding: "buffer",
    });
    return stdout;
  } catch (error) {
    const stderr =
      error && typeof error === "object" && "stderr" in error
        ? String((error as { stderr: unknown }).stderr)
        : String(error);
    throw new RepositoryError(`git ${args.join(" ")} failed: ${stderr.trim()}`);
  }
}

function isSafeRepoPath(path: string): boolean {
  if (path.length === 0) return false;
  if (path.startsWith("/")) return false;
  const segments = path.split("/");
  return !segments.includes("..");
}

function isBinaryContent(buffer: Buffer): boolean {
  return buffer.includes(0);
}

interface Snapshot {
  text?: string;
  binary: boolean;
  truncated: boolean;
}

function toSnapshot(
  buffer: Buffer | undefined,
  maxFileBytes: number | undefined,
): Snapshot | undefined {
  if (buffer === undefined) return undefined;
  if (isBinaryContent(buffer)) return { binary: true, truncated: false };
  if (maxFileBytes !== undefined && buffer.byteLength > maxFileBytes) {
    return { binary: false, truncated: true };
  }
  return { text: buffer.toString("utf8"), binary: false, truncated: false };
}

interface NameStatusEntry {
  status: ChangedFileStatus;
  path: string;
  previousPath?: string;
}

function parseNameStatusZ(output: string): NameStatusEntry[] {
  const tokens = output.split(NUL).filter((token) => token.length > 0);
  const entries: NameStatusEntry[] = [];
  let i = 0;
  while (i < tokens.length) {
    const rawStatus = tokens[i];
    if (rawStatus === undefined) break;
    i += 1;
    const code = rawStatus[0];
    if (code === "R" || code === "C") {
      const previousPath = tokens[i];
      const path = tokens[i + 1];
      i += 2;
      if (previousPath === undefined || path === undefined) continue;
      entries.push({
        status: code === "R" ? "renamed" : "modified",
        path,
        ...(code === "R" ? { previousPath } : {}),
      });
    } else {
      const path = tokens[i];
      i += 1;
      if (path === undefined) continue;
      const status: ChangedFileStatus =
        code === "A" ? "added" : code === "D" ? "deleted" : "modified";
      entries.push({ status, path });
    }
  }
  return entries;
}

export class GitRepository implements Repository {
  private constructor(
    readonly root: string,
    readonly baseRevision: string,
    readonly headRevision: string,
    private readonly options: GitRepositoryOptions,
  ) {}

  static async create(
    root: string,
    baseRef: string,
    headRef: string,
    options: GitRepositoryOptions = {},
  ): Promise<GitRepository> {
    const toplevel = (await runGit(root, ["rev-parse", "--show-toplevel"])).toString("utf8").trim();

    const headSha = (await runGit(toplevel, ["rev-parse", headRef])).toString("utf8").trim();

    let mergeBaseSha: string;
    try {
      mergeBaseSha = (await runGit(toplevel, ["merge-base", baseRef, headRef]))
        .toString("utf8")
        .trim();
    } catch {
      throw new RepositoryError(
        `Unable to find a common ancestor between "${baseRef}" and "${headRef}". ` +
          "This usually means the checkout is shallow. Fetch with a full history " +
          "(e.g. actions/checkout with fetch-depth: 0) and try again.",
      );
    }

    return new GitRepository(toplevel, mergeBaseSha, headSha, options);
  }

  async changedFiles(): Promise<ChangedFile[]> {
    const raw = await runGit(this.root, [
      "diff",
      "--name-status",
      "--find-renames",
      "-z",
      this.baseRevision,
      this.headRevision,
    ]);
    const entries = parseNameStatusZ(raw.toString("utf8"));

    const batch = new GitCatFileBatch(this.root);
    try {
      const snapshots = await Promise.all(
        entries.map(async (entry) => {
          const before =
            entry.status === "added"
              ? undefined
              : await this.readSnapshotViaBatch(
                  batch,
                  this.baseRevision,
                  entry.previousPath ?? entry.path,
                );
          const after =
            entry.status === "deleted"
              ? undefined
              : await this.readSnapshotViaBatch(batch, this.headRevision, entry.path);
          return { entry, before, after };
        }),
      );

      return snapshots.map(({ entry, before, after }) => {
        const binary = Boolean(before?.binary) || Boolean(after?.binary);
        const truncated = Boolean(before?.truncated) || Boolean(after?.truncated);

        return {
          path: entry.path,
          status: entry.status,
          ...(entry.previousPath !== undefined ? { previousPath: entry.previousPath } : {}),
          ...(before?.text !== undefined ? { before: before.text } : {}),
          ...(after?.text !== undefined ? { after: after.text } : {}),
          binary,
          truncated,
        };
      });
    } finally {
      batch.close();
    }
  }

  async readAt(revision: string, path: string): Promise<string | undefined> {
    const snapshot = await this.readSnapshot(revision, path);
    return snapshot?.text;
  }

  async existsAt(revision: string, path: string): Promise<boolean> {
    if (!isSafeRepoPath(path)) return false;
    try {
      await runGit(this.root, ["cat-file", "-e", `${revision}:${path}`]);
      return true;
    } catch {
      return false;
    }
  }

  private async readSnapshotViaBatch(
    batch: GitCatFileBatch,
    revision: string,
    path: string,
  ): Promise<Snapshot | undefined> {
    if (!isSafeRepoPath(path)) return { binary: true, truncated: false };
    const buffer = await batch.request(`${revision}:${path}`);
    return toSnapshot(buffer, this.options.maxFileBytes);
  }

  private async readSnapshot(revision: string, path: string): Promise<Snapshot | undefined> {
    if (!isSafeRepoPath(path)) return { binary: true, truncated: false };
    let buffer: Buffer;
    try {
      buffer = await runGit(this.root, ["show", `${revision}:${path}`]);
    } catch {
      return undefined;
    }
    return toSnapshot(buffer, this.options.maxFileBytes);
  }
}
