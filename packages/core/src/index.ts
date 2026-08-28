export * from "./errors.js";
export * from "./version.js";

export * from "./result/types.js";
export * from "./result/format.js";

export * from "./repository/types.js";
export { GitRepository } from "./repository/GitRepository.js";
export type { GitRepositoryOptions } from "./repository/GitRepository.js";

export * from "./detection/types.js";
export { DetectorRegistry } from "./detection/DetectorRegistry.js";
export { LoadBearingEngine } from "./detection/Engine.js";
export type { EngineOptions, EngineRunResult } from "./detection/Engine.js";
export { isIgnoredPath } from "./detection/ignore.js";

export * from "./config/schema.js";
export * from "./config/load.js";

export * from "./approval/types.js";
export { resolveLatestApprovals } from "./approval/resolve.js";

export { DefaultPolicyEngine } from "./policy/PolicyEngine.js";
export type { PolicyEngine } from "./policy/PolicyEngine.js";
export {
  applyEffectiveSeverities,
  effectiveSeverity,
  maximumSeverity,
  severityRank,
} from "./policy/severity.js";
export { applySuppressions } from "./policy/suppress.js";
