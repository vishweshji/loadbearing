# Writing a detector

This walks through what a new built-in detector needs, beyond the short version in
[CONTRIBUTING.md](../CONTRIBUTING.md#adding-a-detector).

## Before writing code

Ask: does this detect a *decision*, or a *style preference*? LoadBearing detects things other
code is likely to build upon — a new persistent model, a new contract, a new deployable, a new
piece of infrastructure, a new external dependency. It does not detect code quality, naming
conventions, or "this could be written more idiomatically." If you're not sure which side of
that line your idea falls on, open an issue with a concrete before/after example before writing
a detector — see the `feature_request` issue template.

## Directory shape

```text
packages/detectors/src/LBxxx-name/
  detector.ts       # exports a DetectorDefinition
  ecosystems/        # one file per format/ecosystem this detector understands
  fixtures/           # optional: reusable YAML fixtures, see below
  tests/
    detector.test.ts
  README.md
```

Look at `packages/detectors/src/LB001-external-dependency/` for the reference shape: one
`ecosystems/*.ts` file per manifest format, each exporting a pure `findNewX(before, after)`
function that the top-level `detector.ts` dispatches to based on file path. Keep ecosystem
modules free of `Finding` construction — they should return plain data (`{name, severity}`-style
records); `detector.ts` is the only place that builds `Finding` objects. This keeps the
evidence-formatting logic in one place per detector and makes the ecosystem modules trivially
unit-testable without constructing a fake `DetectorContext`.

## The `DetectorDefinition` contract

```typescript
interface DetectorDefinition {
  id: string; // "LBxxx", permanent once released — see the ID ranges in CONTRIBUTING.md
  name: string;
  description: string;
  defaultSeverity: Severity;
  supportedFiles?: string[]; // glob-ish hints, shown by `loadbearing explain`
  detect(context: DetectorContext): Promise<Finding[]>;
}
```

`detect` receives the already-ignore-filtered `changedFiles` for this run, plus the `Repository`
(for the rare case you need to read a file *not* in the diff — most detectors never need this).
Return `[]` when nothing matches; never throw for "this file doesn't look relevant," only for a
genuine internal error you want to fail the whole analysis (see below).

## Fail-open or fail-closed?

If your detector's own `defaultSeverity` is `high`, an unparseable-but-plausibly-relevant file
should make the whole run fail rather than silently report no findings (see LB002's SQL/Django/
Alembic/Rails scanners, which are regex-based and therefore degrade gracefully by design — see
LOADBEARING.md §63 for the reasoning, and match it deliberately if your parser can distinguish
"malformed" from "no match"). If your detector defaults to `medium` or lower, prefer skipping
the file over failing the run — see LB001's `parse()` functions, which return `undefined` on a
JSON/TOML parse error and are treated as "skip this file," not a hard failure.

## Fixtures and tests

Every detector needs, at minimum:

- a **positive** fixture (a real match)
- a **negative** fixture (content that should *not* match, even though it's plausible)
- a **near-miss** fixture (content that superficially resembles a match but isn't one — e.g.
  the matched keyword appearing in a comment, a README, or an unrelated file type)
- a **modification** fixture (only newly added content should be flagged, not everything already
  in the file)
- a **deletion** fixture (a deleted file never produces a finding)
- a **rename** fixture, where relevant

These are currently expressed as inline Vitest cases building a `DetectorContext` directly (see
any existing `tests/detector.test.ts`), not as the standalone YAML fixture format described in
LOADBEARING.md §37 — that fixture-runner infrastructure doesn't exist yet in 0.1. If you build
it, keep the existing inline tests working; don't require a rewrite to adopt it.

## False-positive discipline

If you're fixing a false positive rather than adding new detection: add the offending example as
a negative fixture, confirm it would have failed before your fix (a red test), fix the detector,
and keep the fixture forever — even after the underlying bug is long gone. The fixture corpus is
one of this project's most valuable long-term assets; a detector bug that's fixed without a
permanent regression test can come back.
