# Architecture

## Package dependency direction

```text
core
 ↑
detectors
 ↑
cli / action / mcp
```

More precisely:

- `core` cannot depend on `detectors`.
- `core` cannot depend on GitHub (no Octokit, no `@actions/*`).
- `detectors` cannot depend on `cli`, `action`, or `mcp`.
- `cli`, `action`, and `mcp` cannot depend on each other - they are three independent,
  equally-privileged front ends over `core` + `detectors`, not layered on one another.

This is enforced by pnpm workspace dependency declarations (a package can only import what it
declares as a dependency) and should additionally be enforced by lint/CI boundary checks as the
codebase grows.

## Packages

### `@loadbearing/core`

No dependency on GitHub Actions, Octokit, or specific detector implementations. Responsible for:

- the repository abstraction (`Repository`, `GitRepository`, `ChangedFile`)
- the change model
- configuration loading and validation
- the `Detector` / `DetectorDefinition` interfaces
- the analysis engine (`LoadBearingEngine`)
- the policy engine
- result types (`Finding`, `ReviewResult`)
- the `ApprovalProvider` interface (GitHub-specific implementations live in `action`)

### `@loadbearing/detectors`

Depends on `@loadbearing/core`. Contains the built-in deterministic detectors (LB001–LB005) and
the built-in detector registry.

### `@loadbearing/cli`

Depends on `@loadbearing/core` and `@loadbearing/detectors`. Handles argument parsing, terminal
output, git repository discovery, and process exit codes. No GitHub-specific code.

### `@loadbearing/action`

Depends on `@loadbearing/core`, `@loadbearing/detectors`, `@actions/core`, `@actions/github`.
Handles GitHub event context resolution, PR review retrieval (`GitHubApprovalProvider`), GitHub
Actions output (annotations, job summary), and Action inputs.

### `@loadbearing/mcp`

Depends on `@loadbearing/core` and `@loadbearing/detectors` - not on `@loadbearing/cli`, even
though its `review` tool overlaps with the CLI's `review` command; both are independent, thin
front ends over the same engine rather than one wrapping the other. Exposes `review` and
`explain` as MCP tools over stdio for Claude Code, Cursor, and other MCP clients - see
[docs/agents.md](./docs/agents.md).

## Core engine

`GitRepository` computes changed files between a base and head revision. Per the project's own
review discipline, this must use three-dot (`merge-base`) semantics - diffing against
`merge-base(base, head)`, not `base` directly - so that changes already merged into the base
branch after the PR diverged are never attributed to the PR.

Detectors receive a `DetectorContext` built from the changed-file set and produce zero or more
`Finding`s. The engine aggregates findings into a `ReviewResult`. It does not decide policy.

## Policy engine

Detection answers "what happened." Policy answers "what should we do about it." The policy
engine takes findings plus repository configuration (and, in GitHub mode, approval context) and
produces a `PolicyDecision`: whether architecture review is required, and whether it's currently
satisfied. Detectors never know about approval state; the policy engine never inspects repository
content directly.

## Approval resolution

`ApprovalProvider` is a narrow interface (`getApprovals(pullRequest)`) so the policy engine's
tests can use a fake provider and so a future non-GitHub host would not require rewriting policy.
`GitHubApprovalProvider` is the only implementation in `action`; it normalizes GitHub's review API
responses into `ReviewApproval` records before policy evaluation.

## Failure semantics

If a file that could plausibly be relevant to an enabled HIGH-severity detector cannot be
reliably parsed, analysis fails rather than silently reporting no findings. A green check must
never be produced when an important detector could not run.
