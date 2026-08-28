import { describe, expect, it } from "vitest";
import { isIgnoredPath } from "./ignore.js";

describe("isIgnoredPath", () => {
  it("matches a glob pattern", () => {
    expect(isIgnoredPath("vendor/lib/thing.js", ["vendor/**"])).toBe(true);
  });

  it("matches a suffix pattern", () => {
    expect(isIgnoredPath("src/api.generated.ts", ["**/*.generated.*"])).toBe(true);
  });

  it("does not match unrelated paths", () => {
    expect(isIgnoredPath("src/index.ts", ["vendor/**", "fixtures/**"])).toBe(false);
  });

  it("returns false when there are no patterns", () => {
    expect(isIgnoredPath("src/index.ts", [])).toBe(false);
  });
});
