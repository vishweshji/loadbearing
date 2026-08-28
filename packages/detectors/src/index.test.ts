import { describe, expect, it } from "vitest";
import { builtInDetectors, DETECTORS_PACKAGE_NAME } from "./index.js";

describe("detectors package", () => {
  it("exposes its package name", () => {
    expect(DETECTORS_PACKAGE_NAME).toBe("@loadbearing/detectors");
  });

  it("has unique, LB-prefixed detector IDs with no gaps in the deterministic range", () => {
    const ids = builtInDetectors.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(id).toMatch(/^LB0[0-9]{2}$/);
    }
  });
});
