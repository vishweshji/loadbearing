import { describe, expect, it } from "vitest";
import type { ReviewResult } from "./types.js";
import { formatJson, formatText } from "./format.js";

function baseResult(overrides: Partial<ReviewResult> = {}): ReviewResult {
  return {
    version: "0.1.0",
    baseSha: "aaa",
    headSha: "bbb",
    impact: "none",
    findings: [],
    policyDecision: {
      architectureReviewRequired: false,
      requiredApprovals: 0,
      approvalSatisfied: true,
    },
    stats: {
      changedFiles: 0,
      ignoredFiles: 0,
      analyzedFiles: 0,
      detectorsRun: 5,
      findingsCount: 0,
      durationMs: 10,
    },
    ...overrides,
  };
}

describe("formatText", () => {
  it("prints a clean pass for no findings", () => {
    const text = formatText(baseResult());
    expect(text).toContain("Architecture impact: NONE");
    expect(text).toContain("No consequential architectural changes detected.");
  });

  it("lists findings sorted by descending severity and requires review", () => {
    const result = baseResult({
      impact: "high",
      findings: [
        {
          detectorId: "LB001",
          category: "external-dependency",
          severity: "medium",
          confidence: 1,
          title: "External dependency",
          description: "Adds runtime dependency: @auth0/node",
          rationale: "reason",
          evidence: [
            {
              file: "services/identity/package.json",
              kind: "manifest-change",
              description: "added",
            },
          ],
        },
        {
          detectorId: "LB002",
          category: "persistent-schema",
          severity: "high",
          confidence: 1,
          title: "Persistent schema",
          description: "Introduces table: customer_identity",
          rationale: "reason",
          evidence: [
            {
              file: "db/migrations/042_customer_identity.sql",
              kind: "schema-change",
              description: "CREATE TABLE",
            },
          ],
        },
      ],
      policyDecision: {
        architectureReviewRequired: true,
        requiredApprovals: 1,
        approvalSatisfied: false,
        authorizedReviewers: ["alice"],
      },
    });

    const text = formatText(result);
    const highIndex = text.indexOf("LB002");
    const medIndex = text.indexOf("LB001");
    expect(highIndex).toBeGreaterThan(-1);
    expect(medIndex).toBeGreaterThan(highIndex);
    expect(text).toContain("Architecture review required.");
  });

  it("explains clearly when review is required but no reviewers are configured", () => {
    const result = baseResult({
      impact: "high",
      findings: [
        {
          detectorId: "LB002",
          category: "persistent-schema",
          severity: "high",
          confidence: 1,
          title: "Persistent schema",
          description: "Introduces table: customer_identity",
          rationale: "reason",
          evidence: [],
        },
      ],
      policyDecision: {
        architectureReviewRequired: true,
        requiredApprovals: 1,
        approvalSatisfied: false,
        authorizedReviewers: [],
      },
    });

    const text = formatText(result);
    expect(text).toContain("no authorized reviewers are configured");
  });
});

describe("formatJson", () => {
  it("produces a versioned, machine-readable payload", () => {
    const parsed = JSON.parse(formatJson(baseResult({ impact: "none" })));
    expect(parsed.schemaVersion).toBe(1);
    expect(parsed.toolVersion).toBe("0.1.0");
    expect(parsed.impact).toBe("none");
  });
});
