import { describe, expect, it } from "vitest";
import { CORE_DEPENDENCY_NAME, DETECTORS_PACKAGE_NAME } from "./index.js";

describe("detectors package", () => {
  it("exposes its package name and depends on core", () => {
    expect(DETECTORS_PACKAGE_NAME).toBe("@loadbearing/detectors");
    expect(CORE_DEPENDENCY_NAME).toBe("@loadbearing/core");
  });
});
