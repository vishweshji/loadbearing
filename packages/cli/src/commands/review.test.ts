import type { DetectorContext, DetectorDefinition, Finding } from "@loadbearing/core";
import { DetectorRegistry } from "@loadbearing/core";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  EXIT_ANALYSIS_FAILURE,
  EXIT_INVALID_CONFIGURATION,
  EXIT_OK,
  EXIT_REVIEW_REQUIRED,
  EXIT_UNSUPPORTED_ENVIRONMENT,
} from "../exitCodes.js";
import { runReview } from "./review.js";

let dir: string;

function git(cwd: string, args: string[]): string {
  return execFileSync(
    "git",
    ["-c", "user.email=test@example.com", "-c", "user.name=test", ...args],
    { cwd, encoding: "utf8" },
  ).trim();
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "loadbearing-cli-review-"));
  git(dir, ["init", "--initial-branch=main"]);
  writeFileSync(join(dir, "README.md"), "hello\n");
  git(dir, ["add", "."]);
  git(dir, ["commit", "-m", "initial commit"]);
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function highSeverityDetector(): DetectorDefinition {
  return {
    id: "LB999",
    name: "Test high-severity detector",
    description: "Always flags",
    defaultSeverity: "high",
    async detect(context: DetectorContext): Promise<Finding[]> {
      if (context.changedFiles.length === 0) return [];
      return [
        {
          detectorId: "LB999",
          category: "infrastructure-resource",
          severity: "high",
          confidence: 1,
          title: "Test finding",
          description: "Always fires for testing",
          rationale: "test",
          evidence: [
            {
              file: context.changedFiles[0]?.path ?? "unknown",
              kind: "pattern-match",
              description: "matched",
            },
          ],
        },
      ];
    },
  };
}

describe("runReview", () => {
  it("exits 0 with NONE impact when nothing consequential changed", async () => {
    git(dir, ["checkout", "-b", "feature"]);
    writeFileSync(join(dir, "notes.txt"), "notes\n");
    git(dir, ["add", "."]);
    git(dir, ["commit", "-m", "add notes"]);

    const outcome = await runReview({
      base: "main",
      head: "feature",
      format: "text",
      debug: false,
      noPolicy: false,
      cwd: dir,
    });

    expect(outcome.exitCode).toBe(EXIT_OK);
    expect(outcome.stdout).toContain("Architecture impact: NONE");
  });

  it("prints valid JSON with --format json", async () => {
    const outcome = await runReview({
      base: "main",
      head: "main",
      format: "json",
      debug: false,
      noPolicy: false,
      cwd: dir,
    });

    const parsed = JSON.parse(outcome.stdout);
    expect(parsed.schemaVersion).toBe(1);
  });

  it("exits 1 when architecture review is required and unsatisfied", async () => {
    writeFileSync(
      join(dir, ".loadbearing.yml"),
      "version: 1\nreview:\n  reviewers:\n    users:\n      - alice\n",
    );
    git(dir, ["checkout", "-b", "feature"]);
    writeFileSync(join(dir, "risky.txt"), "risky\n");
    git(dir, ["add", "."]);
    git(dir, ["commit", "-m", "add risky file"]);

    const outcome = await runReview({
      base: "main",
      head: "feature",
      format: "text",
      debug: false,
      noPolicy: false,
      cwd: dir,
      registry: new DetectorRegistry([highSeverityDetector()]),
    });

    expect(outcome.exitCode).toBe(EXIT_REVIEW_REQUIRED);
    expect(outcome.stdout).toContain("Architecture review required");
  });

  it("clearly explains when review is required but no reviewers are configured", async () => {
    git(dir, ["checkout", "-b", "feature"]);
    writeFileSync(join(dir, "risky.txt"), "risky\n");
    git(dir, ["add", "."]);
    git(dir, ["commit", "-m", "add risky file"]);

    const outcome = await runReview({
      base: "main",
      head: "feature",
      format: "text",
      debug: false,
      noPolicy: false,
      cwd: dir,
      registry: new DetectorRegistry([highSeverityDetector()]),
    });

    expect(outcome.exitCode).toBe(EXIT_REVIEW_REQUIRED);
    expect(outcome.stdout).toContain("no authorized reviewers are configured");
  });

  it("--no-policy always exits 0 even when review would otherwise be required", async () => {
    git(dir, ["checkout", "-b", "feature"]);
    writeFileSync(join(dir, "risky.txt"), "risky\n");
    git(dir, ["add", "."]);
    git(dir, ["commit", "-m", "add risky file"]);

    const outcome = await runReview({
      base: "main",
      head: "feature",
      format: "text",
      debug: false,
      noPolicy: true,
      cwd: dir,
      registry: new DetectorRegistry([highSeverityDetector()]),
    });

    expect(outcome.exitCode).toBe(EXIT_OK);
  });

  it("exits 4 when the directory is not a git repository", async () => {
    const nonRepoDir = mkdtempSync(join(tmpdir(), "loadbearing-not-a-repo-"));
    try {
      const outcome = await runReview({
        base: "main",
        head: "HEAD",
        format: "text",
        debug: false,
        noPolicy: false,
        cwd: nonRepoDir,
      });
      expect(outcome.exitCode).toBe(EXIT_UNSUPPORTED_ENVIRONMENT);
    } finally {
      rmSync(nonRepoDir, { recursive: true, force: true });
    }
  });

  it("exits 2 with an actionable message on invalid configuration", async () => {
    writeFileSync(join(dir, ".loadbearing.yml"), "version: 1\nreview:\n  required_at: critical\n");

    const outcome = await runReview({
      base: "main",
      head: "main",
      format: "text",
      debug: false,
      noPolicy: false,
      cwd: dir,
    });

    expect(outcome.exitCode).toBe(EXIT_INVALID_CONFIGURATION);
    expect(outcome.stderr).toContain(".loadbearing.yml");
  });

  it("exits 3 when the base revision cannot be resolved", async () => {
    const outcome = await runReview({
      base: "does-not-exist",
      head: "main",
      format: "text",
      debug: false,
      noPolicy: false,
      cwd: dir,
    });

    expect(outcome.exitCode).toBe(EXIT_ANALYSIS_FAILURE);
  });

  it("includes debug counts when --debug is set", async () => {
    const outcome = await runReview({
      base: "main",
      head: "main",
      format: "text",
      debug: true,
      noPolicy: false,
      cwd: dir,
    });

    expect(outcome.stdout).toContain("Changed files:");
  });
});
