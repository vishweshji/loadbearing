import { describe, expect, it } from "vitest";
import { ACTION_PACKAGE_NAME } from "./index.js";

describe("action package", () => {
  it("exposes its package name", () => {
    expect(ACTION_PACKAGE_NAME).toBe("@loadbearing/action");
  });
});
