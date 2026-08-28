# Configuration

LoadBearing reads `.loadbearing.yml` (or `.loadbearing.yaml` - not both; having both is a
configuration error) from the repository root. If neither exists, the built-in default applies.

Run `loadbearing init` to generate a starter file with comments, or `loadbearing init --force`
to overwrite an existing one.

## Full reference

```yaml
version: 1 # required; only 1 exists today

review:
  required_at: high # low | medium | high - findings at or above this impact require review
  minimum_approvals: 1 # how many qualifying approvals are needed
  require_fresh_approval: true # an approval only counts if submitted on the current head SHA

  reviewers:
    users: [] # GitHub usernames authorized to satisfy architecture review

detectors:
  LB001:
    enabled: true
    severity: medium # overrides LB001's own severity for every finding it produces

  # ...same shape for LB002-LB005

ignore:
  paths:
    - "vendor/**"
    - "fixtures/**"
    - "**/*.generated.*"

limits:
  max_file_bytes: 1048576 # files larger than this are truncated, not read
  max_changed_files: 2000 # analysis fails above this many analyzed (post-ignore) files

suppressions:
  - detector: LB001
    path: tools/package.json
    reason: Development tooling dependencies do not affect runtime architecture.
```

## Severity overrides are per detector, not per finding

`detectors.<id>.severity` sets the severity for every finding a detector produces - it does not
let you say "LB002's new-model findings are HIGH but its new-index findings are MEDIUM." A
detector's own internal severity variation (LB001's runtime-vs-dev split, LB002's
optional-vs-required-field split) is only overridden when the configured value actually differs
from that detector's own default; setting `severity: medium` on LB001 when its default is
already `medium` is a no-op, not a flattening of its dev/runtime distinction. See
`packages/core/src/policy/severity.ts` for the exact rule if you're debugging unexpected
severities.

## Suppressions vs. `ignore.paths`

`ignore.paths` excludes files from analysis entirely, for every detector - use it for vendored
code, fixtures, and generated files. `suppressions` is narrower: it silences one specific
detector's findings on one specific path (a glob), and requires a `reason`, so it shows up in
code review as a deliberate, explained decision rather than a silent carve-out.

## The "no reviewers configured" trap

If a HIGH finding fires but `review.reviewers.users` is empty, LoadBearing does not block
forever with no explanation - the CLI and the Action's job summary both print the exact fix:

```text
Architecture review is required, but no authorized reviewers are configured.

Add reviewers under:

review:
  reviewers:
    users:
      - github-username
```

## Limitation: no team support yet

Version 0.1 does not support `reviewers.teams`. A repository-scoped GitHub Actions token cannot
reliably resolve arbitrary organization team membership without additional organization
permissions this project deliberately doesn't ask for. List individual usernames instead. A
future GitHub App integration may add team support.
