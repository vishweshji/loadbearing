export type ReviewState = "approved" | "changes-requested" | "commented" | "dismissed";

export interface ReviewApproval {
  reviewer: string;
  state: ReviewState;
  commitSha?: string;
  submittedAt: string;
}

export interface PullRequestContext {
  owner: string;
  repo: string;
  number: number;
  author: string;
  baseSha: string;
  headSha: string;
}

export interface ApprovalProvider {
  getApprovals(pullRequest: PullRequestContext): Promise<ReviewApproval[]>;
}

export interface ApprovalContext {
  approvals: ReviewApproval[];
  prAuthor: string;
  headSha: string;
}
