import type { DetectorDefinition } from "@loadbearing/core";
import { LB001 } from "./LB001-external-dependency/detector.js";
import { LB002 } from "./LB002-persistent-schema/detector.js";

export const DETECTORS_PACKAGE_NAME = "@loadbearing/detectors";

export const builtInDetectors: DetectorDefinition[] = [LB001, LB002];

export { LB001, LB002 };
