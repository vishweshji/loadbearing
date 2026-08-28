# LB001 — New External Dependency

## What it detects

The introduction of a new direct dependency in a package manifest — a dependency name that
appears in the manifest after the change but did not appear in it before. A version bump on an
already-present dependency is not flagged; only new packages are.

## What it intentionally does not detect

- Version upgrades/downgrades of an existing dependency.
- Transitive/lockfile-only changes (`package-lock.json`, `pnpm-lock.yaml`, `poetry.lock`,
  `Cargo.lock`, `go.sum`, ...). Only manifests are inspected.
- Whether the dependency itself is trustworthy, secure, or well-maintained — that's a job for a
  dependency/vulnerability scanner, not LoadBearing.
- Removal of a dependency.

## Supported ecosystems

| Ecosystem  | File(s)                                                     |
| ---------- | ------------------------------------------------------------ |
| JavaScript | `package.json` (`dependencies`, `optionalDependencies`, `peerDependencies`, `devDependencies`) |
| Python     | `pyproject.toml` (`project.dependencies`, `project.optional-dependencies`, `tool.poetry.dependencies`, `tool.poetry.group.*.dependencies`), `requirements.txt`, `requirements-*.txt` |
| Go         | `go.mod` (`require` block and single-line `require` statements) |
| Rust       | `Cargo.toml` (`[dependencies]`, `[build-dependencies]`, `[dev-dependencies]`) |

## Default severity

`MEDIUM` for a runtime dependency, `LOW` for a development-only dependency (`devDependencies`,
non-`requirements.txt` requirements files, `tool.poetry.group.*.dependencies`,
`[dev-dependencies]`).

## Example

```text
LB001 New external dependency

MEDIUM

services/identity/package.json

Adds runtime dependency: @auth0/node@^5.1.0

Why this matters:
New runtime dependencies can establish long-term coupling to an external library, API, or
ecosystem.
```

## Known false positives

- A `requirements-*.txt` file that is actually a production manifest (e.g.
  `requirements-prod.txt`) is classified as development-only, because the detector only treats
  the exact filename `requirements.txt` as runtime. Use a per-path severity override or
  suppression in `.loadbearing.yml` if this doesn't match your repository's convention.
- A Poetry dependency group intended for production use (anything other than the top-level
  `tool.poetry.dependencies` table) is always classified as low severity, since grouped
  dependencies are conventionally non-production (`dev`, `test`, `docs`, ...).

## Known false negatives

- A dependency reintroduced under a different declared name than before (e.g. renaming an npm
  package alias) is treated as a new dependency, which is correct; but a dependency that moves
  between manifests it can't reason about jointly (e.g. from `requirements.txt` into a
  `pyproject.toml` in the same PR) is reported as both "removed" (silently, since removals
  aren't flagged) and "added" rather than recognized as a migration.
- Lockfile-only additions (a transitive dependency newly pinned directly) are not detected,
  by design — see "what it intentionally does not detect" above.
