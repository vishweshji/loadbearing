import { getOctokit } from "@actions/github";
import type { PullRequestContext, ReviewResult } from "@loadbearing/core";

const MARKER = "<!-- loadbearing:review-comment -->";

export interface PrComment {
  id: number;
  body: string;
}

export interface CommentClient {
  list(pullRequest: PullRequestContext): Promise<PrComment[]>;
  create(pullRequest: PullRequestContext, body: string): Promise<void>;
  update(pullRequest: PullRequestContext, commentId: number, body: string): Promise<void>;
}

export function createOctokitCommentClient(token: string): CommentClient {
  const octokit = getOctokit(token);
  return {
    async list(pullRequest) {
      const comments = await octokit.paginate(octokit.rest.issues.listComments, {
        owner: pullRequest.owner,
        repo: pullRequest.repo,
        issue_number: pullRequest.number,
        per_page: 100,
      });
      return comments.map((c) => ({ id: c.id, body: c.body ?? "" }));
    },
    async create(pullRequest, body) {
      await octokit.rest.issues.createComment({
        owner: pullRequest.owner,
        repo: pullRequest.repo,
        issue_number: pullRequest.number,
        body,
      });
    },
    async update(pullRequest, commentId, body) {
      await octokit.rest.issues.updateComment({
        owner: pullRequest.owner,
        repo: pullRequest.repo,
        comment_id: commentId,
        body,
      });
    },
  };
}

function mentionList(reviewers: string[]): string {
  return reviewers.length > 0 ? reviewers.map((r) => `@${r}`).join(", ") : "a project maintainer";
}

export function buildReviewComment(result: ReviewResult, reviewers: string[]): string {
  const findingLines =
    result.findings.length > 0
      ? result.findings.map((f) => `- **${f.detectorId}** ${f.description}`).join("\n")
      : "- (no findings listed)";

  return [
    MARKER,
    `This PR introduces a load-bearing architectural change (**${result.impact.toUpperCase()}** impact). Consider getting a review from ${mentionList(reviewers)} before merging.`,
    "",
    "<details><summary>Findings</summary>",
    "",
    findingLines,
    "",
    "</details>",
    "",
    "_This is advisory and does not block merging (`review.mode: comment`)._",
  ].join("\n");
}

export function buildResolvedComment(): string {
  return [
    MARKER,
    "Architecture review is no longer flagged as needed for the current version of this PR.",
  ].join("\n");
}

export async function upsertReviewComment(
  client: CommentClient,
  pullRequest: PullRequestContext,
  result: ReviewResult,
  reviewers: string[],
): Promise<void> {
  const comments = await client.list(pullRequest);
  const existing = comments.find((c) => c.body.startsWith(MARKER));

  if (result.policyDecision.architectureReviewRequired) {
    const body = buildReviewComment(result, reviewers);
    if (existing !== undefined) {
      await client.update(pullRequest, existing.id, body);
    } else {
      await client.create(pullRequest, body);
    }
  } else if (existing !== undefined) {
    await client.update(pullRequest, existing.id, buildResolvedComment());
  }
}
