# Philosophy

This is the longer version of [MANIFESTO.md](../MANIFESTO.md), for readers who want the
reasoning behind each principle, not just the principle.

## Why "blast radius, not seniority"

LoadBearing never asks who wrote a change. It asks what the change creates. A junior engineer's
isolated bug fix should move as freely as a senior engineer's - and a senior engineer's new
source of truth deserves the same scrutiny a junior engineer's would. Coding this any other way
(e.g. "require approval for anyone below level N") would encode a status hierarchy into a tool
whose entire purpose is to reason about consequence, not about people. It would also be trivially
wrong in practice: plenty of architecturally consequential PRs come from people the org
considers junior, and plenty of harmless refactors come from staff engineers.

## Why detection and policy are separate

A detector answers "what happened" - a new table, a new dependency, a new endpoint. Policy
answers "what should we do about it" - is this severity high enough, given this repository's
configuration, to require a human? Keeping these separate means a repository can retune its
review threshold, its reviewer list, or its approval freshness rules without touching a single
detector, and a detector's evidence stays honest even if two repositories disagree about how
seriously to treat it.

## Why false positives are treated as a first-class cost

A tool that fires on 40% of pull requests trains people to click through it without reading it.
That failure mode is worse than under-detection, because it silently degrades the signal for
every PR after the first few false alarms - including the ones that actually mattered. This is
why every detector in this repository ships with negative and near-miss fixtures, not just
positive ones (see [contributing-detectors.md](./contributing-detectors.md)), and why the
project's own dogfooding pass treats "zero false positives across our own history" as meaningful
evidence, not a formality.

## Why local-first is non-negotiable

A tool whose default operating mode requires an account, a token, or a call to someone else's
server is a tool whose failure mode is "silently stops working" or "silently leaks your diff."
LoadBearing's core promise - architecture review gating without a hosted dependency - only holds
if the CLI and Action work with nothing but a git checkout. Every future capability (semantic
detectors, a graph model) is designed to preserve that: see
[the roadmap](./roadmap.md) for how optional network-touching features, if they ever exist,
are meant to stay optional.

## Why the engineer still has to write the answer

It would be easy to have an LLM read a diff and generate "here's what this PR is deciding" as a
comment. That's exactly the trap the manifesto warns about: an engineer who accepts a
machine-generated rationale for their own design has not actually thought about the design. When
LoadBearing eventually asks reflective questions ("what decision is this PR making," "what
becomes hard to change afterward"), the point is friction - a moment where the author has to
produce the answer themselves, in their own words, before merging.
