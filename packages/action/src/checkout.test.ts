import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ensurePullRequestCommitsAvailable } from "./checkout.js";

let upstream: string;
let clone: string;

function git(cwd: string, args: string[]): string {
  return execFileSync(
    "git",
    ["-c", "user.email=test@example.com", "-c", "user.name=test", ...args],
    { cwd, encoding: "utf8" },
  ).trim();
}

beforeEach(() => {
  upstream = mkdtempSync(join(tmpdir(), "loadbearing-action-upstream-"));
  git(upstream, ["init", "--initial-branch=main"]);
  writeFileSync(join(upstream, "README.md"), "hello\n");
  git(upstream, ["add", "."]);
  git(upstream, ["commit", "-m", "initial"]);

  git(upstream, ["update-ref", "refs/pull/7/head", "HEAD"]);
  writeFileSync(join(upstream, "feature.txt"), "feature\n");
  git(upstream, ["add", "."]);
  git(upstream, ["commit", "-m", "pr commit"]);
  git(upstream, ["update-ref", "refs/pull/7/head", "HEAD"]);
  git(upstream, ["reset", "--hard", "HEAD~1"]);

  clone = mkdtempSync(join(tmpdir(), "loadbearing-action-clone-"));
  // --no-local forces a real ref-negotiated fetch instead of git's local-clone optimization,
  // which otherwise copies the whole object store regardless of ref reachability.
  git(clone, ["clone", "--no-local", upstream, "."]);
});

afterEach(() => {
  rmSync(upstream, { recursive: true, force: true });
  rmSync(clone, { recursive: true, force: true });
});

describe("ensurePullRequestCommitsAvailable", () => {
  it("does nothing when the commits are already present locally", () => {
    const headSha = git(upstream, ["rev-parse", "main"]);
    expect(() => ensurePullRequestCommitsAvailable(clone, 7, [headSha])).not.toThrow();
  });

  it("fetches the PR head ref when a needed commit is missing locally", () => {
    const prHeadSha = git(upstream, ["rev-parse", "refs/pull/7/head"]);

    expect(() => git(clone, ["cat-file", "-e", `${prHeadSha}^{commit}`])).toThrow();

    ensurePullRequestCommitsAvailable(clone, 7, [prHeadSha]);

    expect(() => git(clone, ["cat-file", "-e", `${prHeadSha}^{commit}`])).not.toThrow();
  });
});
