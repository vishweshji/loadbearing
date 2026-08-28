import * as core from "@actions/core";
import type { Finding } from "@loadbearing/core";

export function emitAnnotations(findings: Finding[]): void {
  for (const finding of findings) {
    for (const evidence of finding.evidence) {
      const message = `${finding.detectorId} ${finding.title}: ${evidence.description}`;
      const properties: core.AnnotationProperties = { file: evidence.file };
      if (evidence.line !== undefined) properties.startLine = evidence.line;
      if (evidence.endLine !== undefined) properties.endLine = evidence.endLine;

      if (finding.severity === "high") {
        core.error(message, properties);
      } else {
        core.warning(message, properties);
      }
    }
  }
}
