import type { PullRequestContext } from "@loadbearing/core";
import { describe, expect, it } from "vitest";
import { GitHubApprovalProvider, type RawReview } from "./approvalProvider.js";

const pullRequest: PullRequestContext = {
  owner: "loadbearing-dev",
  repo: "loadbearing",
  number: 1,
  author: "bob",
  baseSha: "base",
  headSha: "head",
};

function provider(reviews: RawReview[]): GitHubApprovalProvider {
  return new GitHubApprovalProvider(async () => reviews);
}

describe("GitHubApprovalProvider", () => {
  it("normalizes an APPROVED review", async () => {
    const approvals = await provider([
      {
        user: { login: "alice" },
        state: "APPROVED",
        commit_id: "abc123",
        submitted_at: "2026-01-01T00:00:00Z",
      },
    ]).getApprovals(pullRequest);

    expect(approvals).toEqual([
      {
        reviewer: "alice",
        state: "approved",
        commitSha: "abc123",
        submittedAt: "2026-01-01T00:00:00Z",
      },
    ]);
  });

  it("normalizes CHANGES_REQUESTED, COMMENTED, and DISMISSED", async () => {
    const approvals = await provider([
      { user: { login: "a" }, state: "CHANGES_REQUESTED", commit_id: "x", submitted_at: "t" },
      { user: { login: "b" }, state: "COMMENTED", commit_id: "x", submitted_at: "t" },
      { user: { login: "c" }, state: "DISMISSED", commit_id: "x", submitted_at: "t" },
    ]).getApprovals(pullRequest);

    expect(approvals.map((a) => a.state)).toEqual(["changes-requested", "commented", "dismissed"]);
  });

  it("filters out a PENDING (not-yet-submitted) review", async () => {
    const approvals = await provider([
      { user: { login: "alice" }, state: "PENDING", commit_id: null, submitted_at: null },
    ]).getApprovals(pullRequest);

    expect(approvals).toHaveLength(0);
  });

  it("filters out a review with no user", async () => {
    const approvals = await provider([
      { user: null, state: "APPROVED", commit_id: "x", submitted_at: "t" },
    ]).getApprovals(pullRequest);

    expect(approvals).toHaveLength(0);
  });

  it("omits commitSha rather than setting it to null when commit_id is null", async () => {
    const approvals = await provider([
      { user: { login: "alice" }, state: "APPROVED", commit_id: null, submitted_at: "t" },
    ]).getApprovals(pullRequest);

    expect(approvals[0]).not.toHaveProperty("commitSha");
  });
});
