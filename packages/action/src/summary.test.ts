import type { ReviewResult } from "@loadbearing/core";
import { describe, expect, it } from "vitest";
import { renderJobSummary } from "./summary.js";

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
      durationMs: 1,
    },
    ...overrides,
  };
}

describe("renderJobSummary", () => {
  it("renders a clean pass for no findings", () => {
    const summary = renderJobSummary(baseResult());
    expect(summary).toContain("Architecture impact: NONE");
  });

  it("renders the findings table and evidence section when review is required", () => {
    const result = baseResult({
      impact: "high",
      findings: [
        {
          detectorId: "LB002",
          category: "persistent-schema",
          severity: "high",
          confidence: 1,
          title: "Persistent schema change",
          description: "Introduces table customer_identity",
          rationale: "reason",
          evidence: [
            {
              file: "db/migrations/1.sql",
              kind: "schema-change",
              description: "CREATE TABLE customer_identity",
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

    const summary = renderJobSummary(result);
    expect(summary).toContain("| HIGH | LB002 |");
    expect(summary).toContain("- @alice");
    expect(summary).toContain("db/migrations/1.sql");
    expect(summary).toContain("not yet satisfied");
  });

  it("explains when no reviewers are configured", () => {
    const result = baseResult({
      impact: "high",
      findings: [
        {
          detectorId: "LB002",
          category: "persistent-schema",
          severity: "high",
          confidence: 1,
          title: "Persistent schema change",
          description: "x",
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

    expect(renderJobSummary(result)).toContain("No authorized reviewers are configured");
  });
});
