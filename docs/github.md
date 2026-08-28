# GitHub integration

## Setup

```yaml
# .github/workflows/loadbearing.yml
name: LoadBearing

on:
  pull_request:
    types:
      - opened
      - synchronize
      - reopened
      - ready_for_review

  pull_request_review:
    types:
      - submitted
      - dismissed

permissions:
  contents: read
  pull-requests: read

jobs:
  architecture:
    name: architecture
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: LoadBearing
        uses: loadbearing-dev/loadbearing@v0
        with:
          github-token: ${{ github.token }}
```

Mark the resulting `LoadBearing / architecture` check as required in your branch protection
settings once you're happy with how it behaves on real PRs.

## Why `pull_request_review` matters

When architecture review is required, the check fails on `pull_request`. When an authorized
reviewer approves, GitHub fires a `pull_request_review` event - which re-runs this same
workflow, re-evaluates the same PR, sees the qualifying approval, and turns the check green.
No LoadBearing server is involved; the whole loop is two GitHub Actions runs.

```text
PR opened → LoadBearing analyzes → HIGH impact → check FAILS
                                                       │
                                    human approves the PR
                                                       │
                                     pull_request_review event
                                                       │
                                     LoadBearing re-evaluates
                                                       │
                              qualifying approval found → check PASSES
```

A later commit invalidates a prior approval whenever `require_fresh_approval: true` (the
default) - the next `pull_request` (`synchronize`) run will fail again until re-approved.

## Why the checkout ref matters

`actions/checkout`'s default ref is not reliably the PR's head commit on a
`pull_request_review` event. The Action doesn't rely on the consuming workflow getting this
exactly right: if the commit it needs isn't already present in the checked-out repository, it
fetches `refs/pull/<number>/head` itself before analyzing.

## Permissions

The Action needs only `contents: read` and `pull-requests: read`. It never requests
`pull-requests: write` - reading PR reviews to evaluate whether approval requirements are met
doesn't require writing anything back. A future optional mode may request reviewers
automatically using write permission, but merge enforcement will never depend on it.

## Fork PRs

The workflow runs on `pull_request`, never `pull_request_target`, and requires no repository
secrets - `github.token`'s default permissions are sufficient to read PR reviews. This matters
because LoadBearing itself is open source: contributors will open PRs from forks against
`loadbearing-dev/loadbearing`, and a `pull_request_target`-based workflow would run with
elevated, secret-bearing permissions against untrusted fork content, which this project
deliberately avoids for any repository using it.

## Outputs

| Output | Description |
| --- | --- |
| `impact` | `"none"`, `"low"`, `"medium"`, or `"high"` |
| `architecture-review-required` | `"true"` or `"false"` |

## Job summary and annotations

Every run writes a Markdown job summary (impact, the findings table, evidence, approval status)
and emits inline annotations on the changed files (`::error` for HIGH findings, `::warning`
otherwise). LoadBearing does not post a PR comment by default, to avoid bot spam - the job
summary and annotations are the primary surface.
