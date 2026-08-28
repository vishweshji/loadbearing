import { minimatch } from "minimatch";
import type { SuppressionConfig } from "../config/schema.js";
import type { Finding } from "../result/types.js";

export function applySuppressions(
  findings: Finding[],
  suppressions: SuppressionConfig[],
): Finding[] {
  if (suppressions.length === 0) return findings;

  return findings.filter((finding) => {
    const matchingSuppressions = suppressions.filter((s) => s.detector === finding.detectorId);
    if (matchingSuppressions.length === 0) return true;

    const suppressed = finding.evidence.every((evidence) =>
      matchingSuppressions.some((s) => minimatch(evidence.file, s.path, { dot: true })),
    );
    return !suppressed;
  });
}
