export { run } from "./run.js";
export type { RunOptions } from "./run.js";
export { resolvePullRequestContext } from "./context.js";
export type { GitHubActionContext } from "./context.js";
export { renderJobSummary } from "./summary.js";
export { emitAnnotations } from "./annotations.js";
export { GitHubContextError } from "./errors.js";

export const ACTION_PACKAGE_NAME = "@loadbearing/action";
