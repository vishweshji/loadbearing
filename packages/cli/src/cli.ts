import { Command, CommanderError } from "commander";
import { runExplain } from "./commands/explain.js";
import { runInit } from "./commands/init.js";
import { runReview } from "./commands/review.js";
import type { CommandOutcome } from "./commands/review.js";
import { runVersion } from "./commands/version.js";
import { EXIT_INVALID_CONFIGURATION, EXIT_OK, EXIT_UNSUPPORTED_ENVIRONMENT } from "./exitCodes.js";

interface ReviewCliOptions {
  base: string;
  head: string;
  config?: string;
  format: string;
  debug?: boolean;
  policy: boolean;
}

interface InitCliOptions {
  force?: boolean;
}

export async function runCli(argv: string[], cwd: string): Promise<CommandOutcome> {
  let stdout = "";
  let stderr = "";
  let exitCode = EXIT_OK;

  const program = new Command();
  program
    .name("loadbearing")
    .description("Detect consequential architectural changes in a pull request.")
    .exitOverride()
    .configureOutput({
      writeOut: (text) => {
        stdout += text;
      },
      writeErr: (text) => {
        stderr += text;
      },
    });

  program
    .command("review")
    .description("Analyze changes between two revisions and report architecture impact.")
    .option("--base <revision>", "base revision to diff from", "origin/main")
    .option("--head <revision>", "head revision to diff to", "HEAD")
    .option("--config <path>", "path to a LoadBearing configuration file")
    .option("--format <format>", "output format: text or json", "text")
    .option("--debug", "print additional debug information")
    .option("--no-policy", "always exit 0 regardless of policy decision")
    .action(async (opts: ReviewCliOptions) => {
      if (opts.format !== "text" && opts.format !== "json") {
        stderr += 'loadbearing: --format must be "text" or "json".\n';
        exitCode = EXIT_INVALID_CONFIGURATION;
        return;
      }
      const outcome = await runReview({
        base: opts.base,
        head: opts.head,
        ...(opts.config !== undefined ? { config: opts.config } : {}),
        format: opts.format,
        debug: opts.debug ?? false,
        noPolicy: !opts.policy,
        cwd,
      });
      stdout += outcome.stdout;
      stderr += outcome.stderr;
      exitCode = outcome.exitCode;
    });

  program
    .command("init")
    .description("Create a starter .loadbearing.yml configuration file.")
    .option("--force", "overwrite an existing configuration file")
    .action((opts: InitCliOptions) => {
      const outcome = runInit({ cwd, force: opts.force ?? false });
      stdout += outcome.stdout;
      stderr += outcome.stderr;
      exitCode = outcome.exitCode;
    });

  program
    .command("explain")
    .description("Print documentation for a detector.")
    .argument("<detectorId>", "detector ID, e.g. LB002")
    .action((detectorId: string) => {
      const outcome = runExplain(detectorId);
      stdout += outcome.stdout;
      stderr += outcome.stderr;
      exitCode = outcome.exitCode;
    });

  program
    .command("version")
    .description("Print the LoadBearing version.")
    .action(() => {
      const outcome = runVersion();
      stdout += outcome.stdout;
      stderr += outcome.stderr;
      exitCode = outcome.exitCode;
    });

  try {
    await program.parseAsync(argv, { from: "user" });
  } catch (error) {
    if (error instanceof CommanderError) {
      exitCode = error.exitCode === 0 ? EXIT_OK : EXIT_UNSUPPORTED_ENVIRONMENT;
    } else {
      throw error;
    }
  }

  return { exitCode, stdout, stderr };
}
