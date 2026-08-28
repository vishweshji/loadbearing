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
  `CronJob`/`Job` object (matched by content - `apiVersion` + `kind` - not filename, since
  manifests can live anywhere), a new Docker Compose service, or a new Serverless Framework
  function (MEDIUM). A newly added `Dockerfile` alone is never flagged; when a new workload also
  appears in the same change, the Dockerfile is attached to that finding as supporting evidence
  rather than generating a separate one. Wired into `builtInDetectors`.
- LB004 (Public Contract Change) detector: OpenAPI/Swagger (matched by content, not filename -
  new endpoint MEDIUM, modified/removed endpoint HIGH, modified shared schema HIGH, using a
  key-order-independent deep comparison), Protobuf (new/changed `service`/`message`/`enum`,
  brace-depth aware so nested blocks don't break extraction), and GraphQL (new/changed
  `type`/`input`/`interface`/`enum`/`union`) - all HIGH by default except OpenAPI's differentiated
  table. AsyncAPI and ad hoc JSON Schema contract paths are not yet supported (documented as a
  known gap). Wired into `builtInDetectors`.
- LB005 (Infrastructure Resource) detector: any Terraform `resource "TYPE" "NAME"` block (no
  hardcoded resource-type list), Kubernetes infrastructure objects (`Service`, `Ingress`,
  `PersistentVolume(Claim)`, `NetworkPolicy`, `Role(Binding)`, `ClusterRole(Binding)` - sharing
  the same content-based matcher as LB003's workload detection, refactored into
  `shared/kubernetesObjects.ts`), and CloudFormation/SAM (`Resources:` entries whose `Type`
  starts with `AWS::`/`Custom::`/`Alexa::`). All HIGH by default. This completes the five
  built-in deterministic detectors (LB001-LB005). Wired into `builtInDetectors`.
- GitHub Action (`@loadbearing/action`, root `action.yml`): resolves `PullRequestContext` from
  `pull_request`/`pull_request_review` event payloads, self-heals the checkout by fetching
  `refs/pull/<n>/head` when a needed commit isn't already present locally (the
  `pull_request_review` checkout-ref gap identified in review), runs the same core engine as the
  CLI, emits `::error`/`::warning` annotations per finding, writes a Markdown job summary, and
  fails the run (`core.setFailed`) when architecture review is required and unsatisfied.
  Bundled to a single `packages/action/dist/index.js` via esbuild rather than `@vercel/ncc` -
  ncc's webpack-based CJS resolution can't handle `@actions/core@3.x`'s ESM-only `exports` map, a
  real toolchain incompatibility, not a config error (esbuild is explicitly allowed by §57's "ncc
  or equivalent").
- Conditional architecture approval: `GitHubApprovalProvider` fetches PR reviews via Octokit
  (through an injectable `ListReviewsFn`, so it's unit-testable without mocking
  `@actions/github`), normalizing GitHub review states (`APPROVED`/`CHANGES_REQUESTED`/
  `COMMENTED`/`DISMISSED`) into core's `ReviewApproval` and dropping `PENDING`/unrecognized
  states and reviews with no user. `run()` builds a real `ApprovalContext` from it, so the
  freshness/authorized-reviewer/bot-exclusion logic is exercised against real GitHub review
  data. A lifecycle test reproduces §71's full integration scenario end to end against a real
  git repo: a schema change fails the check, an approval on that exact commit clears it, a
  follow-up commit makes that approval stale and fails the check again, and a fresh approval on
  the new commit clears it - the explicit "do not release 0.1 before this lifecycle is
  demonstrably correct" bar from §71.
- Dogfooding: `.loadbearing.yml` and `.github/workflows/loadbearing.yml` (using `uses: ./`).
  Ran `loadbearing review` against this repository's own commit history: every finding was a
  true positive, and zero false positives from LB002-LB005 - notably including no false trigger
  from the detector READMEs' own literal `CREATE TABLE`/Terraform/Kubernetes example text, or
  from test fixtures embedding YAML/SQL-like string literals inside `.ts` files.
- Documentation: `docs/philosophy.md`, `docs/detectors.md`, `docs/configuration.md`,
  `docs/github.md`, `docs/contributing-detectors.md`, `docs/roadmap.md`, `docs/agents.md`. A
  real `.github/workflows/release.yml` (build, test, verify the bundled Action artifact has no
  drift, move floating `v0`/`v0.1` tags, create a GitHub release) triggers on a `v*.*.*` tag
  push. npm publication is intentionally left out of it, since §31 makes it unnecessary for the
  Action to function.
- The §37 golden-fixture format and runner: `fixture.yml` (name, base/head directory names,
  expected impact and findings with substring `contains` matching) plus two plain directory
  trees, evaluated by `packages/detectors/src/fixtureRunner.test.ts` against the real built-in
  detectors and engine via a new `DirectoryRepository` (diffs two directories directly - no
  temporary git repository needed per fixture). Fixtures live at the repo root under `fixtures/`
  organized by category (`dependencies`, `schemas`, `deployables`, `contracts`, `infrastructure`,
  `clean`) per §30, doubling as a contributor-friendly, TypeScript-free corpus rather than
  detector-specific test data. Seeded with one fixture per category, including
  `schemas/add-postgres-customer-table`, named after §37's own example. See
  `fixtures/README.md`.
- `@loadbearing/mcp`: an MCP ([Model Context Protocol](https://modelcontextprotocol.io)) server
  exposing `review` and `explain` as native tools for Claude Code, Cursor, and other MCP clients,
  so an agent calls them directly instead of shelling out to the CLI and parsing text output. A
  third independent front end over `@loadbearing/core` + `@loadbearing/detectors` (does not
  depend on `@loadbearing/cli`), matching the existing cli/action package-boundary shape.
  Verified both via an in-memory client/server transport and, manually, the actual stdio
  subprocess a real MCP client would spawn.
- `review.mode` config: `block` (default, unchanged behavior - the required check fails until an
  authorized reviewer approves) or `comment`, a softer opt-in alternative that never fails the
  check and instead upserts a single advisory PR comment ("this PR introduces a load-bearing
  architectural change, consider getting a review from @alice, @bob") whenever review would
  otherwise be required, updating the same comment in place - including to note resolution - as
  the PR changes, rather than reposting or leaving it stale. Needs `pull-requests: write`; if
  that's missing, LoadBearing logs a warning and continues rather than failing the run over an
  optional feature. This repository's own `.loadbearing.yml` now uses `mode: comment` while its
  signal is still being trusted.
- `docs/agents.md`: how to wire LoadBearing into an AI coding agent - MCP config for Claude Code
  and Cursor, a `CLAUDE.md`/`.cursorrules` snippet steering the agent to check architecture
  impact before committing (and explicitly *not* to resolve a HIGH/MEDIUM finding itself by
  editing config, adding a suppression, or self-approving), a pre-commit hook pattern, and exit
  codes for agents driving the CLI directly.
- `action.yml` `branding` (`icon: shield`, `color: gray-dark`), required for GitHub Marketplace
  listing.

### Fixed

- `effectiveSeverity`/`applyEffectiveSeverities` no longer flatten a detector's own per-finding
  severity variation (e.g. LB001's runtime-vs-dev split) under the default config. The default
  config always writes an explicit `detectors.<id>.severity` line matching that detector's
  declared default (per §10); a configured severity now only counts as a real override when it
  differs from the detector's default, otherwise every LB001 finding was silently forced to a
  single severity regardless of what the detector itself reported. Found via a manual end-to-end
  CLI run against a scratch repository, not by the test suite alone.
- `DirectoryRepository`'s directory walk computed each file's path relative to the directory it
  was recursing into, not the tree root, silently dropping subdirectory prefixes (a file at
  `after/deploy/nested/service.yaml` was reported as `service.yaml`). Caught immediately by the
  first fixtures that used a subdirectory, before this ever reached a commit; added a direct
  regression test for it.
- **Performance**: `GitRepository.changedFiles()` spawned two `git show` subprocesses per
  changed file, sequentially - measured at ~3.3s for a 150-file PR (internal `durationMs`),
  well over the §39 target of <2s for under 100 files, with process-spawn overhead as the
  dominant cost, not I/O. Replaced with a single long-lived `git cat-file --batch` process
  (`packages/core/src/repository/catFileBatch.ts`) that serves all object reads for one
  `changedFiles()` call without a per-object spawn. Same 150-file PR now completes in ~86ms
  (~38x), and a 500-file PR in ~240ms.
- **LB002 SQL migration path matching**: the glob patterns (`migrations/**`,
  `db/migrations/**`, etc.) only matched a migrations directory at a fixed prefix, so a real
  migration nested deeper - e.g. `database/postgres/examples/migrations/*.sql`, as in
  golang-migrate/migrate's own examples - was invisible to the detector. Every other detector's
  path matching was already depth-independent (basename or content-based); this was an isolated
  gap. Fixed by prefixing each pattern with `**/`. Found via real-world testing, not by any
  existing test.
- **Marketplace publish rejection**: `action.yml`'s `name: LoadBearing` collided with an
  existing, unrelated GitHub user account (`github.com/loadbearing`) - the actual Marketplace
  uniqueness rule blocks a name matching any existing action, user, org, or Marketplace
  category, not just other published actions, which an earlier Marketplace-search-only check
  missed. Renamed to `LoadBearing Architecture Gate`; being multi-word, it can't collide with a
  GitHub username. Also updated all "loadbearing-dev/loadbearing" placeholder references
  (README, CONTRIBUTING, docs/github.md, the `loadbearing init` template, `.loadbearing.yml`) to
  the real repository, `vishweshji/loadbearing`.

### Verified

- Ran LoadBearing against real, unmodified public repositories to check for crashes and
  false positives/negatives beyond synthetic fixtures: `terraform-aws-modules/terraform-aws-vpc`
  (Terraform - 28 true-positive resource findings across 141 changed files, 0 false positives,
  60 individual commits stress-tested with 0 crashes), `GoogleCloudPlatform/microservices-demo`
  (Kubernetes - correctly found 0 findings on a same-Deployment image-tag-only diff, correctly
  found 5 Deployments + 5 Services at the exact real commit that added them, 80 commits
  stress-tested with 0 crashes), `wagtail/wagtail` (Django - correctly detected a real
  `CreateModel("APIToken")` migration, 150 commits stress-tested with 0 crashes),
  `gin-gonic/gin` (Go - correctly flagged 2 genuinely new `go.mod` requirements while ignoring
  version bumps and a `toolchain` directive in the same diff), `BurntSushi/ripgrep` (Rust -
  correctly flagged a new table-syntax Cargo dependency), and `golang-migrate/migrate` (the SQL
  path-matching bug above). This is meaningfully more confidence than the hand-built fixtures
  alone provided.
- CI now runs [actionlint](https://github.com/rhysd/actionlint) (with shellcheck on inline
  `run:` scripts) against every workflow file on every push/PR. This can't replace an actual
  live GitHub Actions run, but it catches invalid expressions, unknown context fields, and shell
  bugs statically. All four workflows (`ci.yml`, `codeql.yml`, `release.yml`, `loadbearing.yml`)
  pass with zero findings.
- `node24` (already used in `action.yml`'s `runs.using`) and the Marketplace name
  `loadbearing`/`LoadBearing Architecture Gate` were confirmed, not assumed, before relying on
  them - the former is GitHub's current supported and recommended Action runtime, the latter has
  no existing collision.
