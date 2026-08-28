import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { EXIT_INVALID_CONFIGURATION, EXIT_OK } from "../exitCodes.js";
import { runInit } from "./init.js";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "loadbearing-cli-init-"));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("runInit", () => {
  it("creates a .loadbearing.yml with sensible defaults", () => {
    const outcome = runInit({ cwd: dir, force: false });
    expect(outcome.exitCode).toBe(EXIT_OK);

    const path = join(dir, ".loadbearing.yml");
    expect(existsSync(path)).toBe(true);
    expect(readFileSync(path, "utf8")).toContain("required_at: high");
  });

  it("refuses to overwrite an existing config without --force", () => {
    writeFileSync(join(dir, ".loadbearing.yml"), "version: 1\n");
    const outcome = runInit({ cwd: dir, force: false });

    expect(outcome.exitCode).toBe(EXIT_INVALID_CONFIGURATION);
    expect(outcome.stderr).toContain("--force");
  });

  it("overwrites an existing config with --force", () => {
    writeFileSync(join(dir, ".loadbearing.yml"), "version: 1\n");
    const outcome = runInit({ cwd: dir, force: true });

    expect(outcome.exitCode).toBe(EXIT_OK);
    expect(readFileSync(join(dir, ".loadbearing.yml"), "utf8")).toContain("required_at: high");
  });

  it("also refuses to overwrite an existing .loadbearing.yaml without --force", () => {
    writeFileSync(join(dir, ".loadbearing.yaml"), "version: 1\n");
    const outcome = runInit({ cwd: dir, force: false });

    expect(outcome.exitCode).toBe(EXIT_INVALID_CONFIGURATION);
  });
});
