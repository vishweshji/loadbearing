# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this
project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Repository skeleton: pnpm workspaces, TypeScript project references, ESLint, Prettier,
  Vitest, CI.
- Project documentation: README, MANIFESTO, ARCHITECTURE, CONTRIBUTING, GOVERNANCE, SECURITY,
  CODE_OF_CONDUCT.
- Package scaffolding for `@loadbearing/core`, `@loadbearing/detectors`, `@loadbearing/cli`,
  `@loadbearing/action`.
- Core engine (`@loadbearing/core`): `GitRepository` (three-dot/merge-base diff semantics,
  rename/binary/truncation handling, path-traversal guards), `Detector`/`DetectorRegistry`,
  `LoadBearingEngine` (ignore filtering, `max_changed_files` limit, fail-closed on detector
  errors, suppressions, severity overrides), `DefaultPolicyEngine` (review threshold, approval
  freshness, bot/author exclusion), Zod-validated `.loadbearing.yml`/`.loadbearing.yaml` config
  loading with line-numbered actionable errors, and text/JSON result formatters.
- CLI (`@loadbearing/cli`, `loadbearing` binary): `review` (`--base`, `--head`, `--config`,
  `--format text|json`, `--debug`, `--no-policy`), `init` (writes a commented starter
  `.loadbearing.yml`, refuses to clobber an existing one without `--force`), `explain
  <detectorId>`, and `version`. Stable exit codes (0 pass, 1 review required, 2 invalid
  configuration, 3 analysis failure, 4 unsupported invocation/environment) per §6.
- LB001 (New External Dependency) detector: JavaScript/TypeScript (`package.json`), Python
  (`pyproject.toml`, `requirements.txt`/`requirements-*.txt`), Go (`go.mod`), and Rust
  (`Cargo.toml`). Flags newly introduced direct dependencies only (not version bumps), MEDIUM
  for runtime and LOW for development-only. Wired into `@loadbearing/detectors`'
  `builtInDetectors`.
- LB002 (Persistent Schema Change) detector: SQL migrations (`CREATE TABLE`, `ALTER TABLE ...
  ADD COLUMN`, `CREATE TYPE`, `CREATE INDEX`, `ALTER TABLE ... ADD CONSTRAINT` under conventional
  migration directories), Prisma (`schema.prisma`/`**/*.prisma`, new model/enum as HIGH, new
  optional field as MEDIUM, new required field as HIGH), Django migrations
  (`migrations.CreateModel`/`AddField`/`AlterField`), Alembic (`op.create_table`/`add_column`/
  `alter_column`), and Rails (`create_table`/`add_column`/`change_column`/`add_reference` under
  `db/migrate/`). On file modification, only newly added lines are scanned so pre-existing
  statements aren't re-flagged. Wired into `builtInDetectors`.

### Fixed

- `effectiveSeverity`/`applyEffectiveSeverities` no longer flatten a detector's own per-finding
  severity variation (e.g. LB001's runtime-vs-dev split) under the default config. The default
  config always writes an explicit `detectors.<id>.severity` line matching that detector's
  declared default (per §10); a configured severity now only counts as a real override when it
  differs from the detector's default, otherwise every LB001 finding was silently forced to a
  single severity regardless of what the detector itself reported. Found via a manual end-to-end
  CLI run against a scratch repository, not by the test suite alone.
