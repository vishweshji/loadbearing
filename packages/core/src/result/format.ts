import { severityRank } from "../policy/severity.js";
import type { Finding, ReviewResult, Severity } from "./types.js";

const SEVERITY_LABEL: Record<Severity, string> = {
  high: "HIGH",
  medium: "MED",
  low: "LOW",
};

function sortedBySeverityDesc(findings: Finding[]): Finding[] {
  return [...findings].sort((a, b) => severityRank(b.severity) - severityRank(a.severity));
}

function noAuthorizedReviewersMessage(): string {
  return [
    "Architecture review is required, but no authorized reviewers are configured.",
    "",
    "Add reviewers under:",
    "",
    "review:",
    "  reviewers:",
    "    users:",
    "      - github-username",
  ].join("\n");
}

export function formatText(result: ReviewResult): string {
  const lines: string[] = ["LoadBearing", ""];

  if (result.impact === "none") {
    lines.push("Architecture impact: NONE", "", "No consequential architectural changes detected.");
    return lines.join("\n");
  }

  lines.push(`Architecture impact: ${result.impact.toUpperCase()}`, "");
  lines.push(
    `${result.findings.length} consequential change${result.findings.length === 1 ? "" : "s"} detected`,
    "",
  );

  for (const finding of sortedBySeverityDesc(result.findings)) {
    const label = SEVERITY_LABEL[finding.severity].padEnd(6);
    lines.push(`${label}${finding.detectorId} ${finding.title}`);
    for (const evidence of finding.evidence) {
      lines.push(`      ${evidence.file}`);
    }
    lines.push("");
    lines.push(`      ${finding.description}`);
    lines.push("");
  }

  if (result.policyDecision.architectureReviewRequired) {
    const reviewers = result.policyDecision.authorizedReviewers ?? [];
    if (reviewers.length === 0) {
      lines.push(noAuthorizedReviewersMessage());
    } else {
      lines.push("Architecture review required.");
    }
  }

  return lines.join("\n").trimEnd();
}

export interface JsonReviewResult {
  schemaVersion: 1;
  toolVersion: string;
  baseSha: string;
  headSha: string;
  impact: ReviewResult["impact"];
  findings: Finding[];
  policyDecision: ReviewResult["policyDecision"];
  stats: ReviewResult["stats"];
}

export function toJsonResult(result: ReviewResult): JsonReviewResult {
  return {
    schemaVersion: 1,
    toolVersion: result.version,
    baseSha: result.baseSha,
    headSha: result.headSha,
    impact: result.impact,
    findings: result.findings,
    policyDecision: result.policyDecision,
    stats: result.stats,
  };
}

export function formatJson(result: ReviewResult): string {
  return JSON.stringify(toJsonResult(result), null, 2);
}
