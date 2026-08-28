# Contributing to LoadBearing

Thanks for considering a contribution. LoadBearing is a young project with a deliberately narrow
scope - see [MANIFESTO.md](./MANIFESTO.md) and [ARCHITECTURE.md](./ARCHITECTURE.md) before
proposing anything that expands what the tool does.

## Development setup

```bash
git clone https://github.com/loadbearing-dev/loadbearing.git
cd loadbearing
pnpm install
pnpm build
pnpm test
```

## Running checks

```bash
pnpm lint        # eslint
pnpm typecheck    # tsc -b --force
pnpm test         # vitest
pnpm format       # prettier --check
```

All four must pass before a pull request is merged.

## Working on the GitHub Action

`packages/action/dist/index.js` is a committed, bundled artifact - GitHub Actions runs it
directly and never installs dependencies. After changing anything under `packages/action/src/`,
regenerate it and commit the result:

```bash
pnpm --filter @loadbearing/action run bundle
git diff --exit-code packages/action/dist   # CI fails if this differs
```

## Changing a workflow

CI lints every `.github/workflows/*.yml` with [actionlint](https://github.com/rhysd/actionlint)
(including shellcheck on inline `run:` scripts). Install it locally (`brew install actionlint`
or see its README) and run `actionlint` from the repo root before pushing a workflow change -
it catches invalid expressions, unknown context fields, and shell bugs that only otherwise show
up on a live run.

## Adding a detector

Built-in detectors live in `packages/detectors/src/<LBxxx-name>/` and each contain:

```text
detector.ts
README.md
fixtures/
tests/
```

The detector README must document what it detects, what it intentionally does not detect,
supported ecosystems, default severity, examples, and known false positives/negatives.

Detector IDs are public API. Once released, an ID is never reassigned; a deprecated detector
keeps its ID. Reserved ranges:

```text
LB001–LB099  deterministic built-in detectors
LB100–LB199  semantic detectors
LB200–LB299  repository-architecture graph detectors
LB900–LB999  experimental
```

## Fixture expectations

Each detector needs positive, negative, near-miss, modification, and (where relevant) deletion
and rename fixtures. A near-miss fixture proves the detector doesn't fire on text that merely
resembles a match (e.g. `CREATE TABLE` appearing in a README, not a migration file).

## False-positive discipline

Whenever you fix a false positive:

1. Add the offending example as a negative fixture.
2. Prove the old detector would have flagged it (a failing test before your fix).
3. Fix the detector.
4. Keep the fixture permanently.

The easiest meaningful contribution to LoadBearing is often just a fixture. If LoadBearing
incorrectly flags or misses an architectural change, reducing the example to a reproducible
fixture is extremely valuable, even without a code fix attached - see
[fixtures/README.md](./fixtures/README.md) for the golden-fixture format, which needs no
TypeScript: just a `fixture.yml` and two directories.

## Developer Certificate of Origin

Contributions require a DCO sign-off (`git commit -s`) certifying you wrote the contribution or
otherwise have the right to submit it under the project's license. LoadBearing does not use a
copyright-assignment CLA.

## Pull request expectations

- Keep the scope of a PR matched to the issue it addresses.
- Include or update fixtures for any detector behavior change.
- Update the relevant detector `README.md` if behavior changes.
- Don't introduce network calls, code execution of repository content, or telemetry - see
  [SECURITY.md](./SECURITY.md).
