import { describe, expect, it } from "vitest";
import { EXIT_OK } from "../exitCodes.js";
import { runVersion } from "./version.js";

describe("runVersion", () => {
  it("prints the loadbearing version", () => {
    const outcome = runVersion();
    expect(outcome.exitCode).toBe(EXIT_OK);
    expect(outcome.stdout).toMatch(/^loadbearing \d+\.\d+\.\d+\n$/);
  });
});
