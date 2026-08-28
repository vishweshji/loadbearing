# Golden fixtures

This is LoadBearing's fixture corpus - real before/after repository states with an expected
result, run by `packages/detectors/src/fixtureRunner.test.ts` against the actual built-in
detectors and engine (via `pnpm test`). It's organized by category, not by detector, since it
doubles as a language-agnostic, contributor-friendly benchmark: adding a fixture here needs no
TypeScript.

```text
fixtures/
  dependencies/    LB001
  schemas/         LB002
  deployables/     LB003
  contracts/       LB004
  infrastructure/  LB005
  clean/           negative cases - PRs that should produce no findings at all
```

## Adding a fixture

Create a new directory under the right category, containing:

```text
<category>/<fixture-name>/
  fixture.yml
  before/   - the repository state before the change (can be a single file, or omitted entirely
              if the fixture starts from nothing)
  after/    - the repository state after the change
```

`fixture.yml`:

```yaml
name: add-postgres-customer-table

base: before # directory name under this fixture, defaults to "before"
head: after # directory name under this fixture, defaults to "after"

expected:
  impact: high # none | low | medium | high

  findings:
    - detector: LB002
      severity: high # optional
      contains: # substrings that must all appear in the finding's description
        - customer_identity # or one of its evidence entries' descriptions
```

`before/` and `after/` are plain directory trees, not git repositories - the runner diffs them
directly (added/removed/modified by file content) using
`packages/detectors/src/testing/DirectoryRepository.ts`, so no git commands or temporary
repositories are needed to add a fixture.

This is the seed corpus, not a complete one - see
[docs/contributing-detectors.md](../docs/contributing-detectors.md) for the broader test
philosophy (positive/negative/near-miss/modification/deletion cases), most of which currently
live as inline Vitest fixtures per detector rather than here. Adding real-world examples here,
especially ones a detector gets wrong, is one of the most valuable and lowest-friction
contributions to this project.
