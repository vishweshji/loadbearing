import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { ApprovalProvider, ReviewApproval } from "@loadbearing/core";
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

function fixtureContext(baseSha: string, headSha: string): GitHubActionContext {
  return {
    eventName: "pull_request_review",
    repo: { owner: "loadbearing-dev", repo: "loadbearing" },
    payload: {
      pull_request: {
        number: 99,
        user: { login: "bob" },
        base: { sha: baseSha },
        head: { sha: headSha },
      },
    },
  };
}

function approvalsFrom(approvals: ReviewApproval[]): ApprovalProvider {
  return {
    async getApprovals() {
      return approvals;
    },
  };
}

const NO_APPROVALS = approvalsFrom([]);

function aliceApproved(commitSha: string): ApprovalProvider {
  return approvalsFrom([
    { reviewer: "alice", state: "approved", commitSha, submittedAt: new Date().toISOString() },
  ]);
}

beforeAll(() => {
  envDir = mkdtempSync(join(tmpdir(), "loadbearing-lifecycle-env-"));
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

  dir = mkdtempSync(join(tmpdir(), "loadbearing-lifecycle-"));
  git(dir, ["init", "--initial-branch=main"]);
  writeFileSync(
    join(dir, ".loadbearing.yml"),
    ["version: 1", "review:", "  reviewers:", "    users:", "      - alice"].join("\n"),
  );
  writeFileSync(join(dir, "README.md"), "a simple application\n");
  git(dir, ["add", "."]);
  git(dir, ["commit", "-m", "Commit A: simple application"]);
  git(dir, ["checkout", "-b", "feature"]);
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

// Reproduces LOADBEARING.md §71's integration scenario end to end: a HIGH-impact schema change
// fails the check, an authorized approval on that exact commit clears it, a new commit makes
// that approval stale, and a fresh approval on the new commit clears it again.
describe("full architecture-review lifecycle (§71)", () => {
  it("gates a schema-changing PR through the complete approve / re-commit / re-approve cycle", async () => {
    const baseSha = git(dir, ["rev-parse", "main"]);
    const originalExitCode = process.exitCode;

    mkdirSync(join(dir, "db", "migrations"), { recursive: true });
    writeFileSync(
      join(dir, "db/migrations/001_customer_identity.sql"),
      "CREATE TABLE customer_identity (\n  id UUID PRIMARY KEY\n);\n",
    );
    git(dir, ["add", "."]);
    git(dir, ["commit", "-m", "Commit B: add customer_identity table"]);
    const commitB = git(dir, ["rev-parse", "feature"]);

    process.exitCode = originalExitCode;
    await run({
      workspace: dir,
      context: fixtureContext(baseSha, commitB),
      approvalProvider: NO_APPROVALS,
    });
    expect(process.exitCode).toBe(1);

    process.exitCode = originalExitCode;
    await run({
      workspace: dir,
      context: fixtureContext(baseSha, commitB),
      approvalProvider: aliceApproved(commitB),
    });
    expect(process.exitCode).not.toBe(1);
    process.exitCode = originalExitCode;

    writeFileSync(
      join(dir, "db/migrations/002_add_email.sql"),
      "ALTER TABLE customer_identity ADD COLUMN email TEXT;\n",
    );
    git(dir, ["add", "."]);
    git(dir, ["commit", "-m", "Commit C: add email column"]);
    const commitC = git(dir, ["rev-parse", "feature"]);

    process.exitCode = originalExitCode;
    await run({
      workspace: dir,
      context: fixtureContext(baseSha, commitC),
      approvalProvider: aliceApproved(commitB),
    });
    expect(process.exitCode).toBe(1);
    process.exitCode = originalExitCode;

    await run({
      workspace: dir,
      context: fixtureContext(baseSha, commitC),
      approvalProvider: aliceApproved(commitC),
    });
    expect(process.exitCode).not.toBe(1);
    process.exitCode = originalExitCode;
  });
});
