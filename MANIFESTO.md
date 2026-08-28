# The LoadBearing Manifesto

## Code is increasingly cheap. Consequences are not.

An AI coding agent can implement in an afternoon what once took days. That's largely good.
But writing code faster doesn't make architectural decisions cheaper. A one-line dependency
addition can introduce an ecosystem dependency. A ten-line migration can establish a permanent
data model. A small protobuf change can create an external contract.

Review effort should not be allocated according to lines changed. It should be allocated
according to **consequence**.

## Blast radius, not seniority

A junior engineer changing an isolated implementation detail should not require architectural
permission. A staff engineer introducing a new source of truth probably should get another pair
of eyes. LoadBearing never encodes "junior engineers need approval, senior engineers do not." It
encodes "reversible changes move freely, compounding decisions receive attention." The gate
applies to the change, not the author.

## LoadBearing does not design your architecture

It will not say "use PostgreSQL instead of DynamoDB." It will say "this pull request creates a
new persistent source of truth." Its job is to identify decisions worth discussing. Humans
remain responsible for making those decisions.

## AI should not replace architectural ownership

AI systems can produce excellent architectural explanations. That creates a risk: engineers may
outsource understanding of their own design to the agent that wrote it. LoadBearing does not
auto-generate an ADR and ask the engineer to rubber-stamp it. When review is required, the
engineer answers what decision they're making and what becomes hard to change afterward — in
their own words.

## Evidence before opinion

Every finding is backed by evidence pulled from the repository: a file, a line, a matched
construct. A detector may interpret evidence. It may not invent it.

## Deterministic first, semantic later

Version 0.1 works without AI. The first detectors are deterministic and inspect repository
changes directly. Semantic reasoning for decisions that can't be identified syntactically —
shared abstractions, new sources of truth, cross-domain coupling — is a later, optional layer.
The deterministic core remains useful permanently.

## False positives are expensive

A tool that flags everything becomes invisible. LoadBearing is deliberately conservative: missing
an occasional medium-impact decision is preferable to interrupting ordinary pull requests
constantly. Most PRs should pass silently. When LoadBearing does interrupt somebody, the
interruption should feel reasonable.

## Local-first means local-first

No LoadBearing account. No API token. No hosted LoadBearing service. No repository upload. No
telemetry. The CLI reads a git repository and writes a result, on your machine or inside your
own CI.

## Open source is the product, not a funnel

No artificial feature boundaries, no enterprise hooks, no hidden server component, no license
keys, no analytics, no relicensing CLA. Apache 2.0, DCO sign-off. Anyone can fork LoadBearing and
get the complete functional product.

---

> **LoadBearing does not review architecture. It decides when architecture deserves review.**
