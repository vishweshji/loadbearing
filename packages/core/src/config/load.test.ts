import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ConfigurationError } from "../errors.js";
import { loadConfig } from "./load.js";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "loadbearing-config-"));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("loadConfig", () => {
  it("returns the built-in default when no config file exists", () => {
    const config = loadConfig(dir);
    expect(config.review.required_at).toBe("high");
    expect(config.review.mode).toBe("block");
    expect(Object.keys(config.detectors)).toEqual(["LB001", "LB002", "LB003", "LB004", "LB005"]);
  });

  it("loads review.mode: comment when configured", () => {
    writeFileSync(
      join(dir, ".loadbearing.yml"),
      ["version: 1", "review:", "  mode: comment"].join("\n"),
    );

    const config = loadConfig(dir);
    expect(config.review.mode).toBe("comment");
  });

  it("loads and validates a well-formed .loadbearing.yml", () => {
    writeFileSync(
      join(dir, ".loadbearing.yml"),
      [
        "version: 1",
        "review:",
        "  required_at: medium",
        "  reviewers:",
        "    users:",
        "      - alice",
      ].join("\n"),
    );

    const config = loadConfig(dir);
    expect(config.review.required_at).toBe("medium");
    expect(config.review.reviewers.users).toEqual(["alice"]);
  });

  it("rejects a repository with both .loadbearing.yml and .loadbearing.yaml", () => {
    writeFileSync(join(dir, ".loadbearing.yml"), "version: 1\n");
    writeFileSync(join(dir, ".loadbearing.yaml"), "version: 1\n");

    expect(() => loadConfig(dir)).toThrow(ConfigurationError);
  });

  it("produces an actionable error with file and line for an invalid value", () => {
    writeFileSync(
      join(dir, ".loadbearing.yml"),
      ["version: 1", "review:", "  required_at: critical"].join("\n"),
    );

    try {
      loadConfig(dir);
      expect.unreachable("expected loadConfig to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigurationError);
      const message = (error as ConfigurationError).message;
      expect(message).toContain(".loadbearing.yml:3");
      expect(message).toContain("required_at");
    }
  });
});
