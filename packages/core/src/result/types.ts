export type Severity = "low" | "medium" | "high";

export type EvidenceKind =
  | "file-added"
  | "file-modified"
  | "manifest-change"
  | "schema-change"
  | "contract-change"
  | "resource-change"
  | "pattern-match";

export interface Evidence {
  file: string;
  line?: number;
  endLine?: number;
  kind: EvidenceKind;
  excerpt?: string;
  description: string;
}

export type FindingCategory =
  | "external-dependency"
  | "persistent-schema"
  | "new-deployable"
  | "public-contract"
  | "infrastructure-resource";

export interface Finding {
  detectorId: string;
  category: FindingCategory;
  severity: Severity;
  confidence: number;
  title: string;
  description: string;
  rationale: string;
  evidence: Evidence[];
  metadata?: Record<string, unknown>;
}

export interface PolicyDecision {
  architectureReviewRequired: boolean;
  requiredApprovals: number;
  approvalSatisfied: boolean;
  authorizedReviewers?: string[];
}

export interface ReviewStats {
  changedFiles: number;
  ignoredFiles: number;
  analyzedFiles: number;
  detectorsRun: number;
  findingsCount: number;
  durationMs: number;
}

export interface ReviewResult {
  version: string;
  baseSha: string;
  headSha: string;
  impact: Severity | "none";
  findings: Finding[];
  policyDecision: PolicyDecision;
  stats: ReviewStats;
}
