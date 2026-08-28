import { describe, expect, it } from "vitest";
import { CORE_PACKAGE_NAME } from "./index.js";

describe("core package", () => {
  it("exposes its package name", () => {
    expect(CORE_PACKAGE_NAME).toBe("@loadbearing/core");
  });
});
