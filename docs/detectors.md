# Detectors

Version 0.1 ships five deterministic, built-in detectors. Each has its own README with full
detail — what it detects, what it intentionally doesn't, known false positives/negatives, and
examples. This page is the index.

| ID | Name | Default severity | README |
| --- | --- | --- | --- |
| LB001 | New External Dependency | MEDIUM (LOW for dev-only) | [packages/detectors/src/LB001-external-dependency/README.md](../packages/detectors/src/LB001-external-dependency/README.md) |
| LB002 | Persistent Schema Change | HIGH | [packages/detectors/src/LB002-persistent-schema/README.md](../packages/detectors/src/LB002-persistent-schema/README.md) |
| LB003 | New Deployable | HIGH (MEDIUM for Serverless functions) | [packages/detectors/src/LB003-new-deployable/README.md](../packages/detectors/src/LB003-new-deployable/README.md) |
| LB004 | Public Contract Change | HIGH (MEDIUM for a new OpenAPI endpoint) | [packages/detectors/src/LB004-public-contract/README.md](../packages/detectors/src/LB004-public-contract/README.md) |
| LB005 | Infrastructure Resource | HIGH | [packages/detectors/src/LB005-infrastructure-resource/README.md](../packages/detectors/src/LB005-infrastructure-resource/README.md) |

Run `loadbearing explain <id>` for the same summary from the CLI.

## Detector ID ranges

Detector IDs are public API — once released, an ID is never reassigned, and a deprecated
detector keeps its ID. See [CONTRIBUTING.md](../CONTRIBUTING.md#adding-a-detector) for the
reserved ranges (LB001–099 deterministic, LB100–199 semantic, LB200–299 architecture-graph,
LB900–999 experimental) and for what a new detector contribution needs.

## What's deliberately out of scope for 0.1

Every detector's own README lists its specific known false negatives, but some things are out of
scope project-wide, not per-detector — see [MANIFESTO.md](../MANIFESTO.md). In short:
LoadBearing does not judge whether an architecture choice is *good*, does not scan for security
vulnerabilities or license risk, and does not evaluate code quality or test coverage. Other
tools already do those jobs; LoadBearing's job is narrower — identifying decisions that other
code is likely to build upon.
