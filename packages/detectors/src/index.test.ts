import { describe, expect, it } from "vitest";
import { DETECTORS_PACKAGE_NAME } from "./index.js";

describe("detectors package", () => {
  it("exposes its package name", () => {
    expect(DETECTORS_PACKAGE_NAME).toBe("@loadbearing/detectors");
  });
});
