import { describe, expect, it } from "vitest";
import type { Finding } from "../result/types.js";
import { applySuppressions } from "./suppress.js";

function finding(detectorId: string, file: string): Finding {
  return {
    detectorId,
    category: "external-dependency",
    severity: "medium",
    confidence: 1,
    title: "New external dependency",
    description: "Adds runtime dependency",
    rationale: "Reason",
    evidence: [{ file, kind: "manifest-change", description: "added" }],
  };
}

describe("applySuppressions", () => {
  it("removes a finding matching a configured detector + path suppression", () => {
    const findings = [finding("LB001", "tools/package.json")];
    const result = applySuppressions(findings, [
      { detector: "LB001", path: "tools/package.json", reason: "dev tooling only" },
    ]);
    expect(result).toHaveLength(0);
  });

  it("supports glob suppression paths", () => {
    const findings = [finding("LB001", "tools/scripts/package.json")];
    const result = applySuppressions(findings, [
      { detector: "LB001", path: "tools/**", reason: "dev tooling only" },
    ]);
    expect(result).toHaveLength(0);
  });

  it("does not suppress findings from a different detector", () => {
    const findings = [finding("LB002", "tools/package.json")];
    const result = applySuppressions(findings, [
      { detector: "LB001", path: "tools/package.json", reason: "dev tooling only" },
    ]);
    expect(result).toHaveLength(1);
  });

  it("does not suppress a finding whose evidence falls outside the suppressed path", () => {
    const findings = [finding("LB001", "services/identity/package.json")];
    const result = applySuppressions(findings, [
      { detector: "LB001", path: "tools/package.json", reason: "dev tooling only" },
    ]);
    expect(result).toHaveLength(1);
  });
});
