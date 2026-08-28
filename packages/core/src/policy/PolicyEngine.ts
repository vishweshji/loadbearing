import type { ApprovalContext } from "../approval/types.js";
import { resolveLatestApprovals } from "../approval/resolve.js";
import type { LoadBearingConfig } from "../config/schema.js";
import type { Finding, PolicyDecision } from "../result/types.js";
import { maximumSeverity, severityRank } from "./severity.js";

export interface PolicyEngine {
  evaluate(
    findings: Finding[],
    config: LoadBearingConfig,
    approvalContext?: ApprovalContext,
  ): PolicyDecision;
}

export class DefaultPolicyEngine implements PolicyEngine {
  evaluate(
    findings: Finding[],
    config: LoadBearingConfig,
    approvalContext?: ApprovalContext,
  ): PolicyDecision {
    const impact = maximumSeverity(findings);
    const requiredAt = config.review.required_at;

    const architectureReviewRequired =
      impact !== "none" && severityRank(impact) >= severityRank(requiredAt);

    if (!architectureReviewRequired) {
      return {
        architectureReviewRequired: false,
        requiredApprovals: 0,
        approvalSatisfied: true,
      };
    }

    const authorizedReviewers = config.review.reviewers.users;
    const requiredApprovals = config.review.minimum_approvals;

    if (approvalContext === undefined) {
      return {
        architectureReviewRequired: true,
        requiredApprovals,
        approvalSatisfied: false,
        authorizedReviewers,
      };
    }

    const latest = resolveLatestApprovals(approvalContext.approvals);
    const qualifying = latest.filter((approval) => {
      if (approval.state !== "approved") return false;
      if (!authorizedReviewers.includes(approval.reviewer)) return false;
      if (approval.reviewer === approvalContext.prAuthor) return false;
      if (config.review.require_fresh_approval && approval.commitSha !== approvalContext.headSha) {
        return false;
      }
      return true;
    });

    return {
      architectureReviewRequired: true,
      requiredApprovals,
      approvalSatisfied: qualifying.length >= requiredApprovals,
      authorizedReviewers,
    };
  }
}
