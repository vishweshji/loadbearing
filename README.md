# LoadBearing

[![License: Apache 2.0](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](./LICENSE)
[![Node.js >= 20](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org)
[![No account required](https://img.shields.io/badge/account-not%20required-brightgreen)](#local-first)

**Know when a pull request becomes an architecture decision.**

A small pull request can introduce a database schema, a new deployable, a public contract, or an
infrastructure dependency that hundreds of future changes will inherit. Most review tools check
whether code is *correct*. LoadBearing asks a different question:

> **Did this pull request make a decision that deserves human attention before we build on top
> of it?**

It's a local-first, no-account, deterministic architecture gate - a CLI, a GitHub Action, and an
MCP server for AI coding agents, all running the same engine. Most PRs pass silently. When one
introduces something consequential, LoadBearing says exactly what and why, in plain evidence, and
can require a human sign-off before merge.

```text
LoadBearing

Architecture impact: HIGH

2 consequential changes detected

HIGH  LB002 Persistent schema
      db/migrations/042_customer_identity.sql

      Introduces table: customer_identity

MED   LB001 External dependency
      services/identity/package.json

      Adds runtime dependency: @auth0/node

Architecture review required.
```

## Contents

- [Get started](#get-started) - [GitHub Action](#github-action) · [CLI](#cli) · [AI coding agent](#ai-coding-agent-cursor-claude-code)
- [What it detects](#what-it-detects)
- [Configuration](#configuration)
- [How it works](#how-it-works)
- [What it complements](#what-it-complements-not-replaces)
- [Documentation](#documentation)
- [Status](#status)
- [Contributing](#contributing)

## Get started

Pick whichever matches how your team works - they all run the same detectors and policy engine,
so results are identical across all three.

### GitHub Action

Gates pull requests directly. This is the primary way most teams will use LoadBearing.

```yaml
# .github/workflows/loadbearing.yml
name: LoadBearing

on:
  pull_request:
    types: [opened, synchronize, reopened, ready_for_review]
  pull_request_review:
    types: [submitted, dismissed]

permissions:
  contents: read
  pull-requests: read

jobs:
  architecture:
    name: architecture
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
        with:
          fetch-depth: 0

      - uses: loadbearing-dev/loadbearing@v0
        with:
          github-token: ${{ github.token }}
```

```yaml
# .loadbearing.yml
version: 1

review:
  required_at: high
  reviewers:
    users:
      - your-github-name
```

That's it - no signup, no dashboard, no token beyond the one GitHub already gives every
workflow run. See [docs/github.md](./docs/github.md) for how the approve → re-commit →
re-approve check lifecycle works, and [docs/configuration.md](./docs/configuration.md) for the
full `.loadbearing.yml` reference.

### CLI

For local checks, other CI systems, or scripting.

```bash
pnpm add -D @loadbearing/cli   # or npm/yarn - once published, see Status below
loadbearing review --base origin/main --head HEAD
```

Not published yet? Run it straight from this repo:

```bash
git clone https://github.com/loadbearing-dev/loadbearing.git && cd loadbearing
pnpm install && pnpm build
node packages/cli/dist/bin.js review --base HEAD~1 --head HEAD
```

```bash
loadbearing init                          # write a starter .loadbearing.yml
loadbearing explain LB002                 # what a detector does and why
loadbearing review --format json          # machine-readable output
loadbearing review --no-policy            # report findings, always exit 0
```

Exit codes are stable and meant to be scripted against: `0` pass, `1` architecture review
required and unsatisfied, `2` invalid configuration, `3` analysis failure, `4` unsupported
invocation (e.g. not a git repository).

### AI coding agent (Cursor, Claude Code)

`@loadbearing/mcp` exposes `review` and `explain` as native [MCP](https://modelcontextprotocol.io)
tools, so an agent calls them directly instead of shelling out and parsing text.

```json
// .mcp.json (Claude Code) or .cursor/mcp.json (Cursor)
{
  "mcpServers": {
    "loadbearing": {
      "command": "npx",
      "args": ["-y", "@loadbearing/mcp"]
    }
  }
}
```

Then tell the agent when to reach for it - a ready-to-paste `CLAUDE.md`/`.cursorrules` snippet,
plus a pre-commit hook pattern for agents without MCP support, is in
[docs/agents.md](./docs/agents.md).

## What it detects

Five deterministic detectors, each with its own evidence and default severity. No AI, no
network access - every finding is a construct LoadBearing can point to in your diff.

| ID | Detects | Default severity |
| --- | --- | --- |
| [LB001](./packages/detectors/src/LB001-external-dependency/README.md) | A new external dependency (npm/pnpm, pip/poetry, Go modules, Cargo) | MEDIUM (LOW if dev-only) |
| [LB002](./packages/detectors/src/LB002-persistent-schema/README.md) | A new/changed persistent schema (SQL migrations, Prisma, Django, Alembic, Rails) | HIGH |
| [LB003](./packages/detectors/src/LB003-new-deployable/README.md) | A new deployable unit (Kubernetes workload, Compose service, Serverless function) | HIGH (MEDIUM for Serverless) |
| [LB004](./packages/detectors/src/LB004-public-contract/README.md) | A public contract change (OpenAPI, Protobuf, GraphQL) | HIGH (MEDIUM for a new OpenAPI endpoint) |
| [LB005](./packages/detectors/src/LB005-infrastructure-resource/README.md) | A new infrastructure resource (Terraform, Kubernetes infra objects, CloudFormation/SAM) | HIGH |

A version bump, a modification to something that already existed, or a near-miss (the same
keyword appearing in a comment or unrelated file) does not fire - see each detector's README for
what it deliberately does *not* flag, and [docs/detectors.md](./docs/detectors.md) for the index.

## Configuration

```yaml
# .loadbearing.yml
version: 1

review:
  required_at: high # low | medium | high
  minimum_approvals: 1
  require_fresh_approval: true
  reviewers:
    users: [alice, bob]

detectors:
  LB001:
    enabled: true
    severity: medium

ignore:
  paths: ["vendor/**", "fixtures/**"]

suppressions:
  - detector: LB001
    path: tools/package.json
    reason: Development tooling dependencies do not affect runtime architecture.
```

No config file at all? LoadBearing runs with sensible defaults (`required_at: high`, all five
detectors on). Full reference: [docs/configuration.md](./docs/configuration.md).

## How it works

LoadBearing diffs two git revisions using three-dot (`merge-base`) semantics, so a change already
merged into your base branch after your PR diverged is never attributed to your PR. Each enabled
detector inspects only the changed files relevant to it and returns findings with evidence - a
file, a line, a matched construct - never an opaque score. Detection and policy are separate: a
detector says what happened, the policy engine (severity thresholds, suppressions, approval
freshness) decides what that means for this repository.

### Local-first

No LoadBearing account. No API token beyond the one GitHub already provides your workflow. No
hosted service, no repository upload, no telemetry. The CLI reads a local git repository and
writes a result; the Action does the same inside GitHub Actions; the MCP server does the same
over stdio. Nothing here calls out to anything you didn't already trust with your code.

## What it complements (not replaces)

| Tool | Answers |
| --- | --- |
| CODEOWNERS | Who owns the files that changed? |
| Dependency / security scanners | Does this introduce a known vulnerability? |
| Linters | Does this violate a style rule? |
| AI code review | Is anything suspicious or improvable in this code? |
| **LoadBearing** | **Did this create a decision other code is likely to build upon?** |

## Documentation

| | |
| --- | --- |
| [MANIFESTO.md](./MANIFESTO.md) | Why this project exists, principle by principle |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Package boundaries, engine design, failure semantics |
| [docs/detectors.md](./docs/detectors.md) | Detector index, with links to each one's full README |
| [docs/configuration.md](./docs/configuration.md) | Full `.loadbearing.yml` reference |
| [docs/github.md](./docs/github.md) | GitHub Action setup, permissions, the approval lifecycle |
| [docs/agents.md](./docs/agents.md) | MCP setup, `CLAUDE.md`/`.cursorrules`, pre-commit hooks |
| [docs/contributing-detectors.md](./docs/contributing-detectors.md) | Writing a new detector |
| [fixtures/README.md](./fixtures/README.md) | The golden-fixture corpus - the easiest way to contribute |
| [docs/roadmap.md](./docs/roadmap.md) | What's built, what's next, explicit non-goals |
| [SECURITY.md](./SECURITY.md) | Threat model and how to report a vulnerability |

## Status

Version 0.1.0: the CLI, all five detectors, the GitHub Action (including conditional approval),
and the MCP server are implemented and tested (177 tests). This repository doesn't have a GitHub
remote yet, so it hasn't been through a real release, a live PR, or an npm publish - see
[CHANGELOG.md](./CHANGELOG.md) for exactly what's shipped.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). The easiest meaningful contribution to LoadBearing is
often just a fixture: if LoadBearing incorrectly flags or misses an architectural change,
reducing the example to a reproducible fixture in [`fixtures/`](./fixtures/README.md) is
extremely valuable, even without a code fix attached - no TypeScript required.

## License

Apache License 2.0. See [LICENSE](./LICENSE) and [NOTICE](./NOTICE).
