import type { LoadBearingConfig } from "../config/schema.js";
import type { Finding, Severity } from "../result/types.js";

const SEVERITY_RANK: Record<Severity, number> = { low: 1, medium: 2, high: 3 };

export function severityRank(severity: Severity): number {
  return SEVERITY_RANK[severity];
}

// Only a configured severity that differs from the detector's own default counts as an
// override - otherwise the default config (which always writes that same value) would flatten
// detectors that vary severity per finding, like LB001's runtime-vs-dev split.
export function effectiveSeverity(
  finding: Finding,
  config: LoadBearingConfig,
  detectorDefaultSeverity?: Severity,
): Severity {
  const configured = config.detectors[finding.detectorId]?.severity;
  if (configured === undefined) return finding.severity;
  if (detectorDefaultSeverity !== undefined && configured === detectorDefaultSeverity) {
    return finding.severity;
  }
  return configured;
}

export function applyEffectiveSeverities(
  findings: Finding[],
  config: LoadBearingConfig,
  detectorDefaultSeverities: ReadonlyMap<string, Severity> = new Map(),
): Finding[] {
  return findings.map((finding) => ({
    ...finding,
    severity: effectiveSeverity(finding, config, detectorDefaultSeverities.get(finding.detectorId)),
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
