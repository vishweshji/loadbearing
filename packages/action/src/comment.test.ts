import type { PullRequestContext, ReviewResult } from "@loadbearing/core";
import { describe, expect, it } from "vitest";
import {
  buildReviewComment,
  buildResolvedComment,
  upsertReviewComment,
  type CommentClient,
  type PrComment,
} from "./comment.js";

const pullRequest: PullRequestContext = {
  owner: "vishweshji",
  repo: "loadbearing",
  number: 1,
  author: "bob",
  baseSha: "base",
  headSha: "head",
};

function reviewResult(overrides: Partial<ReviewResult> = {}): ReviewResult {
  return {
    version: "0.1.0",
    baseSha: "base",
    headSha: "head",
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
        evidence: [],
      },
    ],
    policyDecision: {
      architectureReviewRequired: true,
      requiredApprovals: 1,
      approvalSatisfied: false,
      authorizedReviewers: ["alice"],
    },
    stats: {
      changedFiles: 1,
      ignoredFiles: 0,
      analyzedFiles: 1,
      detectorsRun: 5,
      findingsCount: 1,
      durationMs: 1,
    },
    ...overrides,
  };
}

function fakeClient(initial: PrComment[] = []): CommentClient & { comments: PrComment[] } {
  const comments = [...initial];
  let nextId = comments.length + 1;
  return {
    comments,
    async list() {
      return comments;
    },
    async create(_pr, body) {
      comments.push({ id: nextId++, body });
    },
    async update(_pr, commentId, body) {
      const existing = comments.find((c) => c.id === commentId);
      if (existing) existing.body = body;
    },
  };
}

describe("buildReviewComment", () => {
  it("mentions the configured reviewers and includes the impact and findings", () => {
    const body = buildReviewComment(reviewResult(), ["alice", "bob"]);
    expect(body).toContain("@alice, @bob");
    expect(body).toContain("HIGH");
    expect(body).toContain("customer_identity");
    expect(body).toContain("does not block merging");
  });

  it("falls back to a generic mention when no reviewers are configured", () => {
    const body = buildReviewComment(reviewResult(), []);
    expect(body).toContain("a project maintainer");
  });
});

describe("upsertReviewComment", () => {
  it("creates a new comment when review is required and none exists yet", async () => {
    const client = fakeClient();
    await upsertReviewComment(client, pullRequest, reviewResult(), ["alice"]);

    expect(client.comments).toHaveLength(1);
    expect(client.comments[0]?.body).toContain("@alice");
  });

  it("updates the existing marked comment instead of creating a second one", async () => {
    const client = fakeClient([{ id: 42, body: buildReviewComment(reviewResult(), ["alice"]) }]);
    const updated = reviewResult({
      findings: [
        {
          detectorId: "LB001",
          category: "external-dependency",
          severity: "medium",
          confidence: 1,
          title: "New external dependency",
          description: "Adds runtime dependency: left-pad",
          rationale: "reason",
          evidence: [],
        },
      ],
      impact: "medium",
    });

    await upsertReviewComment(client, pullRequest, updated, ["alice"]);

    expect(client.comments).toHaveLength(1);
    expect(client.comments[0]?.id).toBe(42);
    expect(client.comments[0]?.body).toContain("left-pad");
  });

  it("does not touch unrelated comments on the PR", async () => {
    const client = fakeClient([{ id: 7, body: "an unrelated human comment" }]);
    await upsertReviewComment(client, pullRequest, reviewResult(), ["alice"]);

    expect(client.comments).toHaveLength(2);
    expect(client.comments[0]?.body).toBe("an unrelated human comment");
  });

  it("does not create a comment when review is not required", async () => {
    const client = fakeClient();
    const clean = reviewResult({
      impact: "none",
      findings: [],
      policyDecision: {
        architectureReviewRequired: false,
        requiredApprovals: 0,
        approvalSatisfied: true,
      },
    });

    await upsertReviewComment(client, pullRequest, clean, ["alice"]);

    expect(client.comments).toHaveLength(0);
  });

  it("updates a stale comment to note resolution once review is no longer required", async () => {
    const client = fakeClient([{ id: 9, body: buildReviewComment(reviewResult(), ["alice"]) }]);
    const clean = reviewResult({
      impact: "none",
      findings: [],
      policyDecision: {
        architectureReviewRequired: false,
        requiredApprovals: 0,
        approvalSatisfied: true,
      },
    });

    await upsertReviewComment(client, pullRequest, clean, ["alice"]);

    expect(client.comments).toHaveLength(1);
    expect(client.comments[0]?.body).toBe(buildResolvedComment());
  });
});
