import type { LoadBearingConfig } from "../config/schema.js";
import type { Finding, Severity } from "../result/types.js";

const SEVERITY_RANK: Record<Severity, number> = { low: 1, medium: 2, high: 3 };

export function severityRank(severity: Severity): number {
  return SEVERITY_RANK[severity];
}

export function effectiveSeverity(finding: Finding, config: LoadBearingConfig): Severity {
  return config.detectors[finding.detectorId]?.severity ?? finding.severity;
}

export function applyEffectiveSeverities(
  findings: Finding[],
  config: LoadBearingConfig,
): Finding[] {
  return findings.map((finding) => ({
    ...finding,
    severity: effectiveSeverity(finding, config),
  }));
}

export function maximumSeverity(findings: Finding[]): Severity | "none" {
  let max: Severity | "none" = "none";
  for (const finding of findings) {
    if (max === "none" || severityRank(finding.severity) > severityRank(max)) {
      max = finding.severity;
    }
  }
  return max;
}
