import type { DetectorDefinition } from "@loadbearing/core";
import { LB001 } from "./LB001-external-dependency/detector.js";
import { LB002 } from "./LB002-persistent-schema/detector.js";
import { LB003 } from "./LB003-new-deployable/detector.js";
import { LB004 } from "./LB004-public-contract/detector.js";
import { LB005 } from "./LB005-infrastructure-resource/detector.js";

export const DETECTORS_PACKAGE_NAME = "@loadbearing/detectors";

export const builtInDetectors: DetectorDefinition[] = [LB001, LB002, LB003, LB004, LB005];

export { LB001, LB002, LB003, LB004, LB005 };
