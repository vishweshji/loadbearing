import { severityRank, type Finding, type ReviewResult } from "@loadbearing/core";

function sortedBySeverityDesc(findings: Finding[]): Finding[] {
  return [...findings].sort((a, b) => severityRank(b.severity) - severityRank(a.severity));
}

export function renderJobSummary(result: ReviewResult): string {
  const lines: string[] = ["# LoadBearing", ""];

  if (result.impact === "none") {
    lines.push(
      "**Architecture impact: NONE**",
      "",
      "No consequential architectural changes detected.",
    );
    return lines.join("\n");
  }

  const findings = sortedBySeverityDesc(result.findings);

  lines.push(`**Architecture impact: ${result.impact.toUpperCase()}**`, "");
  lines.push(
    `${findings.length} consequential change${findings.length === 1 ? "" : "s"} detected.`,
    "",
  );
  lines.push("| Severity | Detector | Finding |", "|---|---|---|");
  for (const finding of findings) {
    lines.push(
      `| ${finding.severity.toUpperCase()} | ${finding.detectorId} | ${finding.description} |`,
    );
  }
  lines.push("");

  if (result.policyDecision.architectureReviewRequired) {
    lines.push(
      "## Why review is required",
      "",
      `Repository policy requires human architecture review for ${result.impact.toUpperCase()} impact changes.`,
      "",
      "## Approval",
      "",
      `Required: ${result.policyDecision.requiredApprovals}`,
      "",
    );

    const reviewers = result.policyDecision.authorizedReviewers ?? [];
    if (reviewers.length === 0) {
      lines.push(
        "No authorized reviewers are configured. Add them under `review.reviewers.users` in " +
          "`.loadbearing.yml`.",
        "",
      );
    } else {
      lines.push("Authorized reviewers:", "", ...reviewers.map((r) => `- @${r}`), "");
    }

    lines.push(
      `Current status: ${result.policyDecision.approvalSatisfied ? "satisfied ✅" : "not yet satisfied"}`,
      "",
    );
  }

  lines.push("## Evidence", "");
  for (const finding of findings) {
    lines.push(`### ${finding.detectorId} — ${finding.title}`, "");
    for (const evidence of finding.evidence) {
      const location =
        evidence.line !== undefined ? `${evidence.file}:${evidence.line}` : evidence.file;
      lines.push(`\`${location}\``, "", evidence.description, "");
    }
  }

  return lines.join("\n").trimEnd();
}
