import { describe, expect, it } from "vitest";
import type { ApprovalContext } from "../approval/types.js";
import { defaultConfig } from "../config/schema.js";
import type { Finding } from "../result/types.js";
import { DefaultPolicyEngine } from "./PolicyEngine.js";

function highFinding(): Finding {
  return {
    detectorId: "LB002",
    category: "persistent-schema",
    severity: "high",
    confidence: 1,
    title: "New persistent table",
    description: "Introduces table customer_identity",
    rationale: "Future code may depend on this persistent model.",
    evidence: [],
  };
}

describe("DefaultPolicyEngine", () => {
  it("does not require review when impact is below the configured threshold", () => {
    const config = defaultConfig();
    config.review.required_at = "high";
    const engine = new DefaultPolicyEngine();

    const decision = engine.evaluate([{ ...highFinding(), severity: "medium" }], config);

    expect(decision.architectureReviewRequired).toBe(false);
    expect(decision.approvalSatisfied).toBe(true);
  });

  it("requires review when impact meets the configured threshold", () => {
    const config = defaultConfig();
    config.review.required_at = "high";
    config.review.reviewers.users = ["alice"];
    const engine = new DefaultPolicyEngine();

    const decision = engine.evaluate([highFinding()], config);

    expect(decision.architectureReviewRequired).toBe(true);
    expect(decision.approvalSatisfied).toBe(false);
    expect(decision.authorizedReviewers).toEqual(["alice"]);
  });

  it("is satisfied by a fresh approval from an authorized reviewer", () => {
    const config = defaultConfig();
    config.review.reviewers.users = ["alice"];
    const engine = new DefaultPolicyEngine();

    const approvalContext: ApprovalContext = {
      prAuthor: "bob",
      headSha: "abc123",
      approvals: [
        { reviewer: "alice", state: "approved", commitSha: "abc123", submittedAt: "2026-01-01" },
      ],
    };

    const decision = engine.evaluate([highFinding()], config, approvalContext);
    expect(decision.approvalSatisfied).toBe(true);
  });

  it("rejects a stale approval when fresh approval is required", () => {
    const config = defaultConfig();
    config.review.reviewers.users = ["alice"];
    config.review.require_fresh_approval = true;
    const engine = new DefaultPolicyEngine();

    const approvalContext: ApprovalContext = {
      prAuthor: "bob",
      headSha: "def456",
      approvals: [
        { reviewer: "alice", state: "approved", commitSha: "abc123", submittedAt: "2026-01-01" },
      ],
    };

    const decision = engine.evaluate([highFinding()], config, approvalContext);
    expect(decision.approvalSatisfied).toBe(false);
  });

  it("does not count an approval later superseded by changes-requested", () => {
    const config = defaultConfig();
    config.review.reviewers.users = ["alice"];
    const engine = new DefaultPolicyEngine();

    const approvalContext: ApprovalContext = {
      prAuthor: "bob",
      headSha: "abc123",
      approvals: [
        { reviewer: "alice", state: "approved", commitSha: "abc123", submittedAt: "2026-01-01" },
        {
          reviewer: "alice",
          state: "changes-requested",
          commitSha: "abc123",
          submittedAt: "2026-01-02",
        },
      ],
    };

    const decision = engine.evaluate([highFinding()], config, approvalContext);
    expect(decision.approvalSatisfied).toBe(false);
  });

  it("does not count the PR author's own approval", () => {
    const config = defaultConfig();
    config.review.reviewers.users = ["alice"];
    const engine = new DefaultPolicyEngine();

    const approvalContext: ApprovalContext = {
      prAuthor: "alice",
      headSha: "abc123",
      approvals: [
        { reviewer: "alice", state: "approved", commitSha: "abc123", submittedAt: "2026-01-01" },
      ],
    };

    const decision = engine.evaluate([highFinding()], config, approvalContext);
    expect(decision.approvalSatisfied).toBe(false);
  });

  it("does not count a bot reviewer's approval", () => {
    const config = defaultConfig();
    config.review.reviewers.users = ["dependabot[bot]"];
    const engine = new DefaultPolicyEngine();

    const approvalContext: ApprovalContext = {
      prAuthor: "bob",
      headSha: "abc123",
      approvals: [
        {
          reviewer: "dependabot[bot]",
          state: "approved",
          commitSha: "abc123",
          submittedAt: "2026-01-01",
        },
      ],
    };

    const decision = engine.evaluate([highFinding()], config, approvalContext);
    expect(decision.approvalSatisfied).toBe(false);
  });
});
