import { z } from "zod";
import type { Severity } from "../result/types.js";

export const severitySchema = z.enum(["low", "medium", "high"]);

export const detectorConfigSchema = z.object({
  enabled: z.boolean().default(true),
  severity: severitySchema.optional(),
});

export const reviewersConfigSchema = z.object({
  users: z.array(z.string()).default([]),
});

export const reviewModeSchema = z.enum(["block", "comment"]);

export const reviewConfigSchema = z.object({
  required_at: severitySchema.default("high"),
  minimum_approvals: z.number().int().min(0).default(1),
  require_fresh_approval: z.boolean().default(true),
  reviewers: reviewersConfigSchema.default({ users: [] }),
  // "block" (default) fails the required check until an authorized reviewer approves, per §7/§71.
  // "comment" never fails the check; the Action instead upserts an advisory PR comment. Opt-in,
  // so existing repos keep exactly today's enforcement unless they deliberately choose otherwise.
  mode: reviewModeSchema.default("block"),
});

export const ignoreConfigSchema = z.object({
  paths: z.array(z.string()).default([]),
});

export const limitsConfigSchema = z.object({
  max_file_bytes: z.number().int().positive().default(1048576),
  max_changed_files: z.number().int().positive().default(2000),
});

export const suppressionConfigSchema = z.object({
  detector: z.string(),
  path: z.string(),
  reason: z.string().min(1, "A suppression must include a non-empty reason."),
});

export const loadBearingConfigSchema = z.object({
  version: z.literal(1),
  review: reviewConfigSchema.default({
    required_at: "high",
    minimum_approvals: 1,
    require_fresh_approval: true,
    reviewers: { users: [] },
    mode: "block",
  }),
  detectors: z.record(z.string(), detectorConfigSchema).default({}),
  ignore: ignoreConfigSchema.default({ paths: [] }),
  limits: limitsConfigSchema.default({ max_file_bytes: 1048576, max_changed_files: 2000 }),
  suppressions: z.array(suppressionConfigSchema).default([]),
});

export type DetectorConfig = z.infer<typeof detectorConfigSchema>;
export type ReviewConfig = z.infer<typeof reviewConfigSchema>;
export type IgnoreConfig = z.infer<typeof ignoreConfigSchema>;
export type LimitsConfig = z.infer<typeof limitsConfigSchema>;
export type SuppressionConfig = z.infer<typeof suppressionConfigSchema>;
export type LoadBearingConfig = z.infer<typeof loadBearingConfigSchema>;

export const DEFAULT_DETECTOR_IDS = ["LB001", "LB002", "LB003", "LB004", "LB005"] as const;

export const DEFAULT_DETECTOR_SEVERITIES: Record<(typeof DEFAULT_DETECTOR_IDS)[number], Severity> =
  {
    LB001: "medium",
    LB002: "high",
    LB003: "high",
    LB004: "high",
    LB005: "high",
  };

export function defaultConfig(): LoadBearingConfig {
  return loadBearingConfigSchema.parse({
    version: 1,
    detectors: Object.fromEntries(
      DEFAULT_DETECTOR_IDS.map((id) => [
        id,
        { enabled: true, severity: DEFAULT_DETECTOR_SEVERITIES[id] },
      ]),
    ),
  });
}
