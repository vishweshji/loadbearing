import { getOctokit } from "@actions/github";
import type {
  ApprovalProvider,
  PullRequestContext,
  ReviewApproval,
  ReviewState,
} from "@loadbearing/core";

export interface RawReview {
  user: { login: string } | null;
  state: string;
  commit_id: string | null;
  submitted_at?: string | null;
}

export type ListReviewsFn = (pullRequest: PullRequestContext) => Promise<RawReview[]>;

function normalizeState(state: string): ReviewState | undefined {
  switch (state) {
    case "APPROVED":
      return "approved";
    case "CHANGES_REQUESTED":
      return "changes-requested";
    case "COMMENTED":
      return "commented";
    case "DISMISSED":
      return "dismissed";
    default:
      return undefined;
  }
}

export class GitHubApprovalProvider implements ApprovalProvider {
  constructor(private readonly listReviews: ListReviewsFn) {}

  async getApprovals(pullRequest: PullRequestContext): Promise<ReviewApproval[]> {
    const rawReviews = await this.listReviews(pullRequest);

    const approvals: ReviewApproval[] = [];
    for (const review of rawReviews) {
      const state = normalizeState(review.state);
      const reviewer = review.user?.login;
      if (state === undefined || reviewer === undefined) continue;

      approvals.push({
        reviewer,
        state,
        ...(review.commit_id !== null ? { commitSha: review.commit_id } : {}),
        submittedAt: review.submitted_at ?? new Date(0).toISOString(),
      });
    }
    return approvals;
  }
}

export function createOctokitListReviews(token: string): ListReviewsFn {
  const octokit = getOctokit(token);
  return async (pullRequest) =>
    octokit.paginate(octokit.rest.pulls.listReviews, {
      owner: pullRequest.owner,
      repo: pullRequest.repo,
      pull_number: pullRequest.number,
      per_page: 100,
    });
}
