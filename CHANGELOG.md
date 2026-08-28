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
