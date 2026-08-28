import type { DetectorDefinition } from "@loadbearing/core";
import { LB001 } from "./LB001-external-dependency/detector.js";

export const DETECTORS_PACKAGE_NAME = "@loadbearing/detectors";

export const builtInDetectors: DetectorDefinition[] = [LB001];

export { LB001 };
