import { describe, expect, it } from "vitest";
import { EXIT_INVALID_CONFIGURATION } from "../exitCodes.js";
import { runExplain } from "./explain.js";

describe("runExplain", () => {
  it("reports an actionable error for an unknown detector ID", () => {
    const outcome = runExplain("LB999");
    expect(outcome.exitCode).toBe(EXIT_INVALID_CONFIGURATION);
    expect(outcome.stderr).toContain("LB999");
  });
});
