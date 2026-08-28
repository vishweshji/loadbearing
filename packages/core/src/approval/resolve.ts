import type { ReviewApproval } from "./types.js";

function isBotReviewer(username: string): boolean {
  return username.endsWith("[bot]");
}

export function resolveLatestApprovals(approvals: ReviewApproval[]): ReviewApproval[] {
  const latestByReviewer = new Map<string, ReviewApproval>();

  for (const approval of approvals) {
    if (isBotReviewer(approval.reviewer)) continue;

    const current = latestByReviewer.get(approval.reviewer);
    if (!current || approval.submittedAt >= current.submittedAt) {
      latestByReviewer.set(approval.reviewer, approval);
    }
  }

  return [...latestByReviewer.values()];
}
