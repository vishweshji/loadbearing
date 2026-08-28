import type { ApprovalContext } from "../approval/types.js";
import type { LoadBearingConfig } from "../config/schema.js";
import { DetectorError, LimitExceededError } from "../errors.js";
import { DefaultPolicyEngine, type PolicyEngine } from "../policy/PolicyEngine.js";
import { applyEffectiveSeverities, maximumSeverity } from "../policy/severity.js";
import { applySuppressions } from "../policy/suppress.js";
import type { ChangedFile, Repository } from "../repository/types.js";
import type { Finding, ReviewResult } from "../result/types.js";
import { LOADBEARING_VERSION } from "../version.js";
import type { DetectorRegistry } from "./DetectorRegistry.js";
import { isIgnoredPath } from "./ignore.js";

export interface EngineOptions {
  repository: Repository;
  registry: DetectorRegistry;
  config: LoadBearingConfig;
  approvalContext?: ApprovalContext;
  policyEngine?: PolicyEngine;
}

export interface EngineRunResult {
  result: ReviewResult;
  ignoredFiles: ChangedFile[];
  analyzedFiles: ChangedFile[];
}

function isDetectorEnabled(id: string, config: LoadBearingConfig): boolean {
  return config.detectors[id]?.enabled ?? true;
}

export class LoadBearingEngine {
  constructor(private readonly options: EngineOptions) {}

  async run(): Promise<EngineRunResult> {
    const start = Date.now();
    const { repository, registry, config, approvalContext } = this.options;
    const policyEngine = this.options.policyEngine ?? new DefaultPolicyEngine();

    const allChangedFiles = await repository.changedFiles();

    const analyzedFiles: ChangedFile[] = [];
    const ignoredFiles: ChangedFile[] = [];
    for (const file of allChangedFiles) {
      if (isIgnoredPath(file.path, config.ignore.paths)) {
        ignoredFiles.push(file);
      } else {
        analyzedFiles.push(file);
      }
    }

    if (analyzedFiles.length > config.limits.max_changed_files) {
      throw new LimitExceededError(
        `This pull request changes ${analyzedFiles.length} files (after ignore rules), ` +
          `exceeding the configured limit of ${config.limits.max_changed_files}. ` +
          "Raise limits.max_changed_files in .loadbearing.yml, or narrow ignore.paths, " +
          "if this is expected.",
      );
    }

    const detectorsToRun = registry
      .all()
      .filter((detector) => isDetectorEnabled(detector.id, config));

    const rawFindings: Finding[] = [];
    for (const detector of detectorsToRun) {
      try {
        const findings = await detector.detect({ repository, changedFiles: analyzedFiles });
        rawFindings.push(...findings);
      } catch (error) {
        throw new DetectorError(
          `Detector ${detector.id} (${detector.name}) failed to analyze this pull request: ` +
            `${error instanceof Error ? error.message : String(error)}. ` +
            "Architecture impact cannot be determined safely, so analysis has failed rather " +
            "than reporting no findings.",
          detector.id,
          error,
        );
      }
    }

    const detectorDefaultSeverities = new Map(
      registry.all().map((detector) => [detector.id, detector.defaultSeverity]),
    );
    const effectiveFindings = applyEffectiveSeverities(
      rawFindings,
      config,
      detectorDefaultSeverities,
    );
    const survivingFindings = applySuppressions(effectiveFindings, config.suppressions);
    const impact = maximumSeverity(survivingFindings);
    const policyDecision = policyEngine.evaluate(survivingFindings, config, approvalContext);

    const result: ReviewResult = {
      version: LOADBEARING_VERSION,
      baseSha: repository.baseRevision,
      headSha: repository.headRevision,
      impact,
      findings: survivingFindings,
      policyDecision,
      stats: {
        changedFiles: allChangedFiles.length,
        ignoredFiles: ignoredFiles.length,
        analyzedFiles: analyzedFiles.length,
        detectorsRun: detectorsToRun.length,
        findingsCount: survivingFindings.length,
        durationMs: Date.now() - start,
      },
    };

    return { result, ignoredFiles, analyzedFiles };
  }
}
