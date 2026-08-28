import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runCli } from "./cli.js";
import { EXIT_INVALID_CONFIGURATION, EXIT_OK, EXIT_UNSUPPORTED_ENVIRONMENT } from "./exitCodes.js";

let dir: string;

function git(cwd: string, args: string[]): string {
  return execFileSync(
    "git",
    ["-c", "user.email=test@example.com", "-c", "user.name=test", ...args],
    { cwd, encoding: "utf8" },
  ).trim();
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "loadbearing-cli-"));
  git(dir, ["init", "--initial-branch=main"]);
  writeFileSync(join(dir, "README.md"), "hello\n");
  git(dir, ["add", "."]);
  git(dir, ["commit", "-m", "initial commit"]);
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("runCli", () => {
  it("routes `review` to the review command", async () => {
    const outcome = await runCli(["review", "--base", "main", "--head", "main"], dir);
    expect(outcome.exitCode).toBe(EXIT_OK);
    expect(outcome.stdout).toContain("Architecture impact: NONE");
  });

  it("routes `version` to the version command", async () => {
    const outcome = await runCli(["version"], dir);
    expect(outcome.exitCode).toBe(EXIT_OK);
    expect(outcome.stdout).toMatch(/^loadbearing \d+\.\d+\.\d+/);
  });

  it("routes `init` to the init command", async () => {
    const outcome = await runCli(["init"], dir);
    expect(outcome.exitCode).toBe(EXIT_OK);
    expect(outcome.stdout).toContain("Created");
  });

  it("routes `explain` with a positional argument", async () => {
    const outcome = await runCli(["explain", "LB999"], dir);
    expect(outcome.exitCode).toBe(EXIT_INVALID_CONFIGURATION);
    expect(outcome.stderr).toContain("LB999");
  });

  it("rejects an invalid --format value", async () => {
    const outcome = await runCli(["review", "--format", "xml"], dir);
    expect(outcome.exitCode).toBe(EXIT_INVALID_CONFIGURATION);
    expect(outcome.stderr).toContain("--format");
  });

  it("prints help and exits cleanly for --help", async () => {
    const outcome = await runCli(["--help"], dir);
    expect(outcome.exitCode).toBe(EXIT_OK);
    expect(outcome.stdout).toContain("review");
  });

  it("exits 4 for an unknown command", async () => {
    const outcome = await runCli(["frobnicate"], dir);
    expect(outcome.exitCode).toBe(EXIT_UNSUPPORTED_ENVIRONMENT);
  });
});
