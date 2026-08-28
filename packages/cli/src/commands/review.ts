import {
  ConfigurationError,
  DetectorError,
  DetectorRegistry,
  formatJson,
  formatText,
  GitRepository,
  LimitExceededError,
  loadConfig,
  LoadBearingEngine,
  RepositoryError,
  type ReviewResult,
} from "@loadbearing/core";
import { builtInDetectors } from "@loadbearing/detectors";

const defaultRegistry = () => new DetectorRegistry(builtInDetectors);
import { isInsideGitWorkTree } from "../environment.js";
import {
  EXIT_ANALYSIS_FAILURE,
  EXIT_INVALID_CONFIGURATION,
  EXIT_OK,
  EXIT_REVIEW_REQUIRED,
  EXIT_UNSUPPORTED_ENVIRONMENT,
} from "../exitCodes.js";

export interface ReviewOptions {
  base: string;
  head: string;
  config?: string;
  format: "text" | "json";
  debug: boolean;
  noPolicy: boolean;
  cwd: string;
  registry?: DetectorRegistry;
}

export interface CommandOutcome {
  exitCode: number;
  stdout: string;
  stderr: string;
}

function debugSummary(result: ReviewResult): string {
  return [
    "",
    `Changed files: ${result.stats.changedFiles}`,
    `Ignored: ${result.stats.ignoredFiles}`,
    `Analyzed: ${result.stats.analyzedFiles}`,
    `Detectors run: ${result.stats.detectorsRun}`,
    `Duration: ${result.stats.durationMs}ms`,
  ].join("\n");
}

export async function runReview(options: ReviewOptions): Promise<CommandOutcome> {
  if (!isInsideGitWorkTree(options.cwd)) {
    return {
      exitCode: EXIT_UNSUPPORTED_ENVIRONMENT,
      stdout: "",
      stderr: `loadbearing: ${options.cwd} is not inside a git repository.\n`,
    };
  }

  let config;
  try {
    config = loadConfig(
      options.cwd,
      options.config !== undefined ? { configPath: options.config } : {},
    );
  } catch (error) {
    if (error instanceof ConfigurationError) {
      return { exitCode: EXIT_INVALID_CONFIGURATION, stdout: "", stderr: `${error.message}\n` };
    }
    throw error;
  }

  let repository;
  try {
    repository = await GitRepository.create(options.cwd, options.base, options.head, {
      maxFileBytes: config.limits.max_file_bytes,
    });
  } catch (error) {
    if (error instanceof RepositoryError) {
      return { exitCode: EXIT_ANALYSIS_FAILURE, stdout: "", stderr: `${error.message}\n` };
    }
    throw error;
  }

  const registry = options.registry ?? defaultRegistry();
  const engine = new LoadBearingEngine({ repository, registry, config });

  let run;
  try {
    run = await engine.run();
  } catch (error) {
    if (error instanceof DetectorError || error instanceof LimitExceededError) {
      return { exitCode: EXIT_ANALYSIS_FAILURE, stdout: "", stderr: `${error.message}\n` };
    }
    throw error;
  }

  const { result } = run;

  let stdout = options.format === "json" ? formatJson(result) : formatText(result);
  stdout += "\n";
  if (options.format === "text" && options.debug) {
    stdout += debugSummary(result) + "\n";
  }

  if (options.noPolicy) {
    return { exitCode: EXIT_OK, stdout, stderr: "" };
  }

  const requiresAction =
    result.policyDecision.architectureReviewRequired && !result.policyDecision.approvalSatisfied;

  return { exitCode: requiresAction ? EXIT_REVIEW_REQUIRED : EXIT_OK, stdout, stderr: "" };
}
