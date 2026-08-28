import { DetectorRegistry } from "@loadbearing/core";
import { builtInDetectors } from "@loadbearing/detectors";
import { EXIT_INVALID_CONFIGURATION, EXIT_OK } from "../exitCodes.js";
import type { CommandOutcome } from "./review.js";

export function runExplain(detectorId: string): CommandOutcome {
  const registry = new DetectorRegistry(builtInDetectors);
  const detector = registry.get(detectorId);

  if (detector === undefined) {
    const available = registry.all().map((d) => d.id);
    const availabilityNote =
      available.length > 0
        ? `Available detectors: ${available.join(", ")}.`
        : "No detectors are currently registered.";
    return {
      exitCode: EXIT_INVALID_CONFIGURATION,
      stdout: "",
      stderr: `loadbearing: unknown detector "${detectorId}". ${availabilityNote}\n`,
    };
  }

  const lines = [
    `${detector.id} ${detector.name}`,
    "",
    "Purpose:",
    detector.description,
    "",
    "Default severity:",
    detector.defaultSeverity.toUpperCase(),
  ];

  if (detector.supportedFiles !== undefined && detector.supportedFiles.length > 0) {
    lines.push("", "Supported files:", ...detector.supportedFiles);
  }

  return { exitCode: EXIT_OK, stdout: `${lines.join("\n")}\n`, stderr: "" };
}
