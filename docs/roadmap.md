# Roadmap

## Status

Version 0.1 is feature-complete against its own specification: five deterministic detectors
(LB001–LB005), the CLI (`review`/`init`/`explain`/`version`), and the GitHub Action with full
conditional-approval support (fresh-approval semantics, the approve → re-commit → re-approve
lifecycle). See [CHANGELOG.md](../CHANGELOG.md) for what shipped in each phase.

## Explicit non-goals for 0.1

These are deliberate scope boundaries, not oversights: GitLab/Bitbucket support, a hosted
service, a dashboard, a repository-wide architecture graph, LLM integration, semantic
shared-abstraction detection, an IDE/VS Code extension, Slack/Jira integration, automatic ADR
generation, automatic architecture fixes, team-based approval resolution, an organization-wide
policy server, and historical architecture analytics. See [MANIFESTO.md](../MANIFESTO.md) for
why - the short version is that most of these would turn LoadBearing into a different, broader
product than "decide when architecture deserves review."

## Near-term: more ecosystem coverage for existing detectors

The fastest way to make LoadBearing more useful without changing what it fundamentally does is
adding coverage to the five existing detectors. Candidates, roughly in order of how often they'd
come up: Laravel migrations, Flyway, Liquibase, Drizzle, TypeORM, Knex, Sequelize (LB002);
Pulumi, AWS CDK, Helm, Nomad (LB003/LB005); gRPC-Gateway, AsyncAPI, Avro, Kafka schemas
(LB004); Rails, Spring, .NET Entity Framework migrations (LB002). Each of these is a
self-contained `ecosystems/*.ts` module plus fixtures - see
[contributing-detectors.md](./contributing-detectors.md). This is the single best way to
contribute to the project without needing to invent a new detector category.

## 0.2: architecture-delta detectors (LB101+)

Reserved ID range: LB101–LB199. Potential detectors, still deterministic where possible:

- **LB101** New shared abstraction
- **LB102** New cross-module dependency direction
- **LB103** New dependency cycle
- **LB104** New source of truth
- **LB105** New cross-domain coupling

For JavaScript/TypeScript, this likely starts with import-graph analysis. Other languages would
need their own adapters, built incrementally - universal parsing across every language isn't a
0.2 goal.

## 0.3: optional semantic reasoning (LB100 range, provider-agnostic)

Only after the deterministic detectors are trusted. The design intent (subject to change before
it's built): a generic command/provider boundary configured like

```yaml
semantic:
  enabled: true
  provider: command
  command:
    executable: my-local-model-wrapper
```

so LoadBearing itself never hard-wires a specific vendor - local models, a company-hosted model,
or any commercial API are all just "a provider," and semantic analysis stays optional and
off by default. When it exists, a semantic detector is asked a narrow, structured question
("does this change introduce an abstraction newly consumed across more than one existing
architectural module?"), never an open-ended "review this PR's architecture" - and it must
receive constrained repository context, not automatically upload an entire repository. It
outputs the same `Finding` shape as every deterministic detector; the policy engine doesn't know
or care whether a finding's evidence came from a regex or a model call.

## Longer term: an architecture graph

The deepest possible extension of this project is maintaining an actual model of the
repository's architecture - modules, services, deployables, datastores, contracts, message
topics, external dependencies, infrastructure resources, ownership, and the dependency edges
between them - and comparing `architecture(base)` to `architecture(head)` directly, so a finding
can say something like "shared domain concept `CustomerIdentity` increased from 2 to 7
architectural dependents" instead of inferring consequence from a single diff. This is
explicitly not a 0.1, 0.2, or even necessarily 0.3 goal; it's the direction the project could
grow into once the deterministic and semantic layers below it are solid.

## Also not yet built

- The YAML golden-fixture format and runner now exist (`fixtures/`, see
  [fixtures/README.md](../fixtures/README.md)), but the corpus itself is a small seed - one
  fixture per category. Growing it, especially with real-world examples a detector gets wrong,
  is high-value and doesn't require touching TypeScript.
- A community detector registry (`detectors.packages`/`detectors.local` in config) - arbitrary
  code loading changes the security model and needs its own design pass first.
- Release automation has never actually been run against a live GitHub remote in this
  repository yet, since it doesn't have one. `.github/workflows/release.yml` is ready to run on
  a `v*` tag push once it does.
