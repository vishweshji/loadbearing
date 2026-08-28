import * as core from "@actions/core";
import { context as githubContext } from "@actions/github";
import { DetectorRegistry, GitRepository, LoadBearingEngine, loadConfig } from "@loadbearing/core";
import { builtInDetectors } from "@loadbearing/detectors";
import { emitAnnotations } from "./annotations.js";
import { ensurePullRequestCommitsAvailable } from "./checkout.js";
import { resolvePullRequestContext, type GitHubActionContext } from "./context.js";
import { GitHubContextError } from "./errors.js";
import { renderJobSummary } from "./summary.js";

export interface RunOptions {
  context?: GitHubActionContext;
  workspace?: string;
}

export async function run(options: RunOptions = {}): Promise<void> {
  const workspace = options.workspace ?? process.env.GITHUB_WORKSPACE;
  if (workspace === undefined) {
    throw new GitHubContextError(
      "GITHUB_WORKSPACE is not set; this Action must run inside GitHub Actions.",
    );
  }

  const prContext = resolvePullRequestContext(options.context ?? githubContext);
  ensurePullRequestCommitsAvailable(workspace, prContext.number, [
    prContext.baseSha,
    prContext.headSha,
  ]);

  const configInput = core.getInput("config");
  const config = loadConfig(workspace, configInput.length > 0 ? { configPath: configInput } : {});

  const repository = await GitRepository.create(workspace, prContext.baseSha, prContext.headSha, {
    maxFileBytes: config.limits.max_file_bytes,
  });

  const registry = new DetectorRegistry(builtInDetectors);
  const engine = new LoadBearingEngine({ repository, registry, config });
  const { result } = await engine.run();

  emitAnnotations(result.findings);
  await core.summary.addRaw(renderJobSummary(result)).write();

  core.setOutput("impact", result.impact);
  core.setOutput("architecture-review-required", result.policyDecision.architectureReviewRequired);

  if (
    result.policyDecision.architectureReviewRequired &&
    !result.policyDecision.approvalSatisfied
  ) {
    core.setFailed(
      `Architecture impact: ${result.impact.toUpperCase()}. Human architecture review is ` +
        "required and has not been satisfied.",
    );
  }
}
