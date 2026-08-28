import { describe, expect, it } from "vitest";
import { CLI_PACKAGE_NAME } from "./index.js";

describe("cli package", () => {
  it("exposes its package name", () => {
    expect(CLI_PACKAGE_NAME).toBe("@loadbearing/cli");
  });
});
