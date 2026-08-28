import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { EXIT_INVALID_CONFIGURATION, EXIT_OK } from "../exitCodes.js";
import type { CommandOutcome } from "./review.js";

const TEMPLATE = `# LoadBearing configuration
# See https://github.com/loadbearing-dev/loadbearing for documentation.

version: 1

review:
  # Findings at or above this severity require human architecture review.
  required_at: high

  # How many qualifying approvals are required once review is triggered.
  minimum_approvals: 1

  # If true, an approval only counts when it was submitted on the PR's
  # current head commit. A new commit after approval makes the check red
  # again until it's re-approved.
  require_fresh_approval: true

  reviewers:
    users: [] # add GitHub usernames here, e.g. ["alice", "bob"]

detectors:
  LB001:
    enabled: true
    severity: medium

  LB002:
    enabled: true
    severity: high

  LB003:
    enabled: true
    severity: high

  LB004:
    enabled: true
    severity: high

  LB005:
    enabled: true
    severity: high

# ignore:
#   paths:
#     - "vendor/**"
#     - "fixtures/**"
#     - "**/*.generated.*"

# limits:
#   max_file_bytes: 1048576
#   max_changed_files: 2000
`;

export interface InitOptions {
  cwd: string;
  force: boolean;
}

export function runInit(options: InitOptions): CommandOutcome {
  const ymlPath = join(options.cwd, ".loadbearing.yml");
  const yamlPath = join(options.cwd, ".loadbearing.yaml");
  const existing = [ymlPath, yamlPath].find((path) => existsSync(path));

  if (existing !== undefined && !options.force) {
    return {
      exitCode: EXIT_INVALID_CONFIGURATION,
      stdout: "",
      stderr: `loadbearing: ${existing} already exists. Use --force to overwrite it.\n`,
    };
  }

  writeFileSync(ymlPath, TEMPLATE);

  return {
    exitCode: EXIT_OK,
    stdout: `Created ${ymlPath}\n`,
    stderr: "",
  };
}
