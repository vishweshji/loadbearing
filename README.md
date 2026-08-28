# LoadBearing

**Know when a pull request becomes an architecture decision.**

Modern development tools make writing code cheap. Architectural decisions are not.

A small pull request can introduce a database schema, service boundary, public contract, or
infrastructure dependency that hundreds of future changes will inherit.

Most review tools inspect whether code is correct. LoadBearing asks a different question:

> **Did this pull request make a decision that deserves human attention before we build on top
> of it?**

LoadBearing is an open-source architecture gate for pull requests. It detects consequential
structural changes and can require an explicit architecture review only when those changes
occur.

```text
PR
 │
 ▼
LoadBearing
 │
 ├── No consequential change ───────► PASS
 │
 └── Architectural consequence
            │
            ▼
      Human review required
            │
            ▼
           PASS
```

LoadBearing does not tell you what architecture to choose. It tells you when you are choosing
architecture.

See [MANIFESTO.md](./MANIFESTO.md) for why this project exists and
[ARCHITECTURE.md](./ARCHITECTURE.md) for how it's built.

---

## Status

Version 0.1.0: the CLI, all five built-in detectors, and the GitHub Action (including
conditional approval) described below are implemented and tested. This repository doesn't have
a GitHub remote yet, so it hasn't been through a real release or a live PR — see
[CHANGELOG.md](./CHANGELOG.md) for what's shipped and [docs/roadmap.md](./docs/roadmap.md) for
what's next.

Also see [docs/detectors.md](./docs/detectors.md), [docs/configuration.md](./docs/configuration.md),
and [docs/github.md](./docs/github.md).

## Quick start

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

## CLI

```bash
pnpm add -D @loadbearing/cli
loadbearing review --base origin/main --head HEAD
```

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

## Local-first

Normal operation requires no LoadBearing account, no API token, no hosted service, no
repository upload, and no telemetry. The CLI reads a git repository and writes a result. The
GitHub Action runs inside GitHub Actions and writes a check result.

## What LoadBearing complements

LoadBearing does not replace CODEOWNERS, required reviews, dependency scanners, security
scanners, linting, architecture test frameworks, or AI code review. It focuses on identifying
new consequential decisions that may not yet have a predefined rule.

## License

Apache License 2.0. See [LICENSE](./LICENSE) and [NOTICE](./NOTICE).

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). The easiest meaningful contribution to LoadBearing is
often a fixture: if LoadBearing incorrectly flags or misses an architectural change, reducing
the example to a reproducible fixture is extremely valuable.
