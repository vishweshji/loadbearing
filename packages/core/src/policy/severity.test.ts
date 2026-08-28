import { describe, expect, it } from "vitest";
import { defaultConfig } from "../config/schema.js";
import type { Finding } from "../result/types.js";
import { applyEffectiveSeverities, effectiveSeverity, maximumSeverity } from "./severity.js";

function finding(overrides: Partial<Finding> = {}): Finding {
  return {
    detectorId: "LB001",
    category: "external-dependency",
    severity: "medium",
    confidence: 1,
    title: "New external dependency",
    description: "Adds runtime dependency: left-pad",
    rationale: "New runtime dependencies can establish long-term coupling.",
    evidence: [],
    ...overrides,
  };
}

describe("effectiveSeverity", () => {
  it("uses the finding's own severity when no override is configured", () => {
    const config = defaultConfig();
    expect(effectiveSeverity(finding({ severity: "medium" }), config)).toBe("medium");
  });

  it("applies a configured detector severity override", () => {
    const config = defaultConfig();
    config.detectors.LB001 = { enabled: true, severity: "high" };
    expect(effectiveSeverity(finding({ severity: "medium" }), config)).toBe("high");
  });

  it("does not flatten a detector's own per-finding severity under the default config", () => {
    // Regression: defaultConfig() always writes detectors.LB001.severity: "medium" (matching
    // LB001's own default), which must not clobber a LOW finding (e.g. a devDependency) that
    // the detector itself downgraded from its own default.
    const config = defaultConfig();
    expect(config.detectors.LB001?.severity).toBe("medium");
    expect(effectiveSeverity(finding({ severity: "low" }), config, "medium")).toBe("low");
  });

  it("treats a configured severity equal to the detector default as no override", () => {
    const config = defaultConfig();
    config.detectors.LB001 = { enabled: true, severity: "medium" };
    expect(effectiveSeverity(finding({ severity: "low" }), config, "medium")).toBe("low");
  });

  it("still applies an override that genuinely differs from the detector default", () => {
    const config = defaultConfig();
    config.detectors.LB001 = { enabled: true, severity: "high" };
    expect(effectiveSeverity(finding({ severity: "low" }), config, "medium")).toBe("high");
  });
});

describe("applyEffectiveSeverities", () => {
  it("rewrites severity on a copy without mutating the input", () => {
    const config = defaultConfig();
    config.detectors.LB001 = { enabled: true, severity: "high" };
    const input = [finding({ severity: "medium" })];
    const result = applyEffectiveSeverities(input, config);

    expect(result[0]?.severity).toBe("high");
    expect(input[0]?.severity).toBe("medium");
  });
});

describe("maximumSeverity", () => {
  it("returns none for an empty finding list", () => {
    expect(maximumSeverity([])).toBe("none");
  });

  it("returns the highest severity among findings", () => {
    const findings = [
      finding({ severity: "low" }),
      finding({ severity: "high" }),
      finding({ severity: "medium" }),
    ];
    expect(maximumSeverity(findings)).toBe("high");
  });

  it("does not escalate impact just because there are multiple medium findings", () => {
    const findings = [
      finding({ severity: "medium" }),
      finding({ severity: "medium" }),
      finding({ severity: "medium" }),
    ];
    expect(maximumSeverity(findings)).toBe("medium");
  });
});
