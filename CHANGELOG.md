# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this
project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.1.0] - 2026-08-28

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
- LB003 (New Deployable) detector: a new Kubernetes `Deployment`/`StatefulSet`/`DaemonSet`/
  `CronJob`/`Job` object (matched by content — `apiVersion` + `kind` — not filename, since
  manifests can live anywhere), a new Docker Compose service, or a new Serverless Framework
  function (MEDIUM). A newly added `Dockerfile` alone is never flagged; when a new workload also
  appears in the same change, the Dockerfile is attached to that finding as supporting evidence
  rather than generating a separate one. Wired into `builtInDetectors`.
- LB004 (Public Contract Change) detector: OpenAPI/Swagger (matched by content, not filename —
  new endpoint MEDIUM, modified/removed endpoint HIGH, modified shared schema HIGH, using a
  key-order-independent deep comparison), Protobuf (new/changed `service`/`message`/`enum`,
  brace-depth aware so nested blocks don't break extraction), and GraphQL (new/changed
  `type`/`input`/`interface`/`enum`/`union`) — all HIGH by default except OpenAPI's differentiated
  table. AsyncAPI and ad hoc JSON Schema contract paths are not yet supported (documented as a
  known gap). Wired into `builtInDetectors`.
- LB005 (Infrastructure Resource) detector: any Terraform `resource "TYPE" "NAME"` block (no
  hardcoded resource-type list), Kubernetes infrastructure objects (`Service`, `Ingress`,
  `PersistentVolume(Claim)`, `NetworkPolicy`, `Role(Binding)`, `ClusterRole(Binding)` — sharing
  the same content-based matcher as LB003's workload detection, refactored into
  `shared/kubernetesObjects.ts`), and CloudFormation/SAM (`Resources:` entries whose `Type`
  starts with `AWS::`/`Custom::`/`Alexa::`). All HIGH by default. This completes the five
  built-in deterministic detectors (LB001–LB005). Wired into `builtInDetectors`.
- GitHub Action (`@loadbearing/action`, root `action.yml`): resolves `PullRequestContext` from
  `pull_request`/`pull_request_review` event payloads, self-heals the checkout by fetching
  `refs/pull/<n>/head` when a needed commit isn't already present locally (the
  `pull_request_review` checkout-ref gap identified in review), runs the same core engine as the
  CLI, emits `::error`/`::warning` annotations per finding, writes a Markdown job summary, and
  fails the run (`core.setFailed`) when architecture review is required and unsatisfied. This
  phase intentionally ignores approvals (§77 Phase 9) — every HIGH-impact PR fails regardless of
  reviews; approval resolution lands next. Bundled to a single `packages/action/dist/index.js`
  via esbuild rather than `@vercel/ncc` — ncc's webpack-based CJS resolution can't handle
  `@actions/core@3.x`'s ESM-only `exports` map, a real toolchain incompatibility, not a config
  error (esbuild is explicitly allowed by §57's "ncc or equivalent").
- Conditional architecture approval (§77 Phase 10): `GitHubApprovalProvider` fetches PR reviews
  via Octokit (through an injectable `ListReviewsFn`, so it's unit-testable without mocking
  `@actions/github`), normalizing GitHub review states (`APPROVED`/`CHANGES_REQUESTED`/
  `COMMENTED`/`DISMISSED`) into core's `ReviewApproval` and dropping `PENDING`/unrecognized
  states and reviews with no user. `run()` now builds a real `ApprovalContext` from it and passes
  it to the engine, so the freshness/authorized-reviewer/bot-exclusion logic already built and
  tested in Phase 2 is now exercised against real GitHub review data. A new lifecycle test
  reproduces §71's full integration scenario end to end against a real git repo: a schema change
  fails the check, an approval on that exact commit clears it, a follow-up commit makes that
  approval stale and fails the check again, and a fresh approval on the new commit clears it —
  the explicit "do not release 0.1 before this lifecycle is demonstrably correct" bar from §71.
- Dogfooding (§77 Phase 11): added `.loadbearing.yml` (`required_at: high`, all five detectors
  enabled, no reviewers configured yet — there's no remote/maintainer username to authorize)
  and `.github/workflows/loadbearing.yml` (using `uses: ./` so the check activates once this
  repo has a GitHub remote). Ran `loadbearing review` against this repository's own full commit
  history (113 changed files across 10 commits, spanning TypeScript, YAML, Markdown, JSON):
  found 8 findings, all true positives (real new dependencies added while building the tool),
  and zero false positives from LB002–LB005 — notably including no false trigger from the
  detector READMEs' own literal `CREATE TABLE`/Terraform/Kubernetes example text, or from test
  fixtures embedding YAML/SQL-like string literals inside `.ts` files. No detector changes were
  needed as a result.
- Release prep (§77 Phase 12): `docs/philosophy.md`, `docs/detectors.md`,
  `docs/configuration.md`, `docs/github.md`, `docs/contributing-detectors.md`, and
  `docs/roadmap.md`. A real `.github/workflows/release.yml` (build, test, verify the bundled
  Action artifact has no drift, move floating `v0`/`v0.1` tags, create a GitHub release) that
  triggers on a `v*.*.*` tag push — replacing the earlier stub. This has not been run against a
  live GitHub remote yet, since this repository doesn't have one; npm publication is
  intentionally left out, since §31 makes it unnecessary for the Action to function.

### Fixed

- `effectiveSeverity`/`applyEffectiveSeverities` no longer flatten a detector's own per-finding
  severity variation (e.g. LB001's runtime-vs-dev split) under the default config. The default
  config always writes an explicit `detectors.<id>.severity` line matching that detector's
  declared default (per §10); a configured severity now only counts as a real override when it
  differs from the detector's default, otherwise every LB001 finding was silently forced to a
  single severity regardless of what the detector itself reported. Found via a manual end-to-end
  CLI run against a scratch repository, not by the test suite alone.
