import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { GitHubActionContext } from "./context.js";
import { run } from "./run.js";

let dir: string;
let envDir: string;
let summaryFile: string;
let outputFile: string;

function git(cwd: string, args: string[]): string {
  return execFileSync(
    "git",
    ["-c", "user.email=test@example.com", "-c", "user.name=test", ...args],
    { cwd, encoding: "utf8" },
  ).trim();
}

function fixtureContext(overrides: { baseSha: string; headSha: string }): GitHubActionContext {
  return {
    eventName: "pull_request",
    repo: { owner: "loadbearing-dev", repo: "loadbearing" },
    payload: {
      pull_request: {
        number: 1,
        user: { login: "bob" },
        base: { sha: overrides.baseSha },
        head: { sha: overrides.headSha },
      },
    },
  };
}

beforeAll(() => {
  // @actions/core's summary helper caches process.env.GITHUB_STEP_SUMMARY on first use, so the
  // path must stay stable across tests in this file — only its contents are reset per test.
  envDir = mkdtempSync(join(tmpdir(), "loadbearing-action-env-"));
  summaryFile = join(envDir, "summary.md");
  outputFile = join(envDir, "output.txt");
  process.env.GITHUB_STEP_SUMMARY = summaryFile;
  process.env.GITHUB_OUTPUT = outputFile;
});

afterAll(() => {
  rmSync(envDir, { recursive: true, force: true });
  delete process.env.GITHUB_STEP_SUMMARY;
  delete process.env.GITHUB_OUTPUT;
});

beforeEach(() => {
  writeFileSync(summaryFile, "");
  writeFileSync(outputFile, "");

  dir = mkdtempSync(join(tmpdir(), "loadbearing-action-run-"));
  git(dir, ["init", "--initial-branch=main"]);
  writeFileSync(join(dir, "README.md"), "hello\n");
  git(dir, ["add", "."]);
  git(dir, ["commit", "-m", "init"]);
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("run", () => {
  it("passes cleanly and writes a NONE summary when nothing consequential changed", async () => {
    git(dir, ["checkout", "-b", "feature"]);
    writeFileSync(join(dir, "notes.txt"), "notes\n");
    git(dir, ["add", "."]);
    git(dir, ["commit", "-m", "add notes"]);

    const baseSha = git(dir, ["rev-parse", "main"]);
    const headSha = git(dir, ["rev-parse", "feature"]);

    const originalExitCode = process.exitCode;
    await run({ workspace: dir, context: fixtureContext({ baseSha, headSha }) });

    expect(process.exitCode).not.toBe(1);
    expect(readFileSync(summaryFile, "utf8")).toContain("Architecture impact: NONE");
    process.exitCode = originalExitCode;
  });

  it("fails the run (sets exit code 1) when a HIGH finding has no satisfied approval", async () => {
    git(dir, ["checkout", "-b", "feature"]);
    mkdirSync(join(dir, "db", "migrations"), { recursive: true });
    writeFileSync(
      join(dir, "db/migrations/001.sql"),
      "CREATE TABLE customer_identity (id UUID);\n",
    );
    git(dir, ["add", "."]);
    git(dir, ["commit", "-m", "add migration"]);

    const baseSha = git(dir, ["rev-parse", "main"]);
    const headSha = git(dir, ["rev-parse", "feature"]);

    const originalExitCode = process.exitCode;
    await run({ workspace: dir, context: fixtureContext({ baseSha, headSha }) });

    expect(process.exitCode).toBe(1);
    const summary = readFileSync(summaryFile, "utf8");
    expect(summary).toContain("Architecture impact: HIGH");
    process.exitCode = originalExitCode;
  });
});
