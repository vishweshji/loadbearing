# Using LoadBearing with an AI coding agent

LoadBearing is designed to run locally with no account and no network access, which makes it a
natural fit for an agent (Claude Code, Cursor, or similar) to call on its own before proposing a
commit or opening a pull request - the same way it would run a linter or the test suite. This
page covers three ways to wire it in, roughly in order of how tightly integrated they are.

## 1. MCP server (recommended for Claude Code / Cursor)

`@loadbearing/mcp` exposes `review` and `explain` as native tools, so the agent calls them
directly instead of shelling out and parsing CLI output.

### Claude Code

Add to `.mcp.json` at your repository root (or run `claude mcp add loadbearing -- npx -y
@loadbearing/mcp`):

```json
{
  "mcpServers": {
    "loadbearing": {
      "command": "npx",
      "args": ["-y", "@loadbearing/mcp"]
    }
  }
}
```

### Cursor

Add to `.cursor/mcp.json` (project-level) or `~/.cursor/mcp.json` (global):

```json
{
  "mcpServers": {
    "loadbearing": {
      "command": "npx",
      "args": ["-y", "@loadbearing/mcp"]
    }
  }
}
```

Once connected, tell the agent when to use it - see the `CLAUDE.md`/`.cursorrules` snippet
below. The `review` tool takes an absolute repository `path`, so it works regardless of the
agent's current working directory.

## 2. Steering the agent to call it

An MCP tool being available doesn't mean an agent will reach for it unprompted. Add something
like this to `CLAUDE.md` or `.cursorrules`:

```markdown
## Before committing or opening a pull request

Run the LoadBearing `review` tool (base: the default branch, head: the current branch) if the
change touches a database migration, an API contract (OpenAPI/GraphQL/Protobuf), a Kubernetes
or Terraform manifest, a Dockerfile, or a package manifest. If it reports `Architecture impact:
HIGH` or `MEDIUM`, mention that to the user before proceeding - don't silently continue past it,
and don't try to resolve it yourself by picking reviewers or editing `.loadbearing.yml` without
asking. It found a real answer to "what does this PR make future code depend on"; the human
still decides what to do about it.
```

Without an MCP client, the same instruction works pointed at the CLI instead - see below.

## 3. CLI, for anything without MCP support

Every agent that can run shell commands can use the CLI the same way CI does:

```bash
loadbearing review --base main --head HEAD --format json
```

Exit codes are stable and worth handling explicitly rather than just checking for zero:

| Code | Meaning |
| --- | --- |
| `0` | Clean, or `--no-policy` was passed |
| `1` | Architecture review is required and unsatisfied - expected, informative output, not a tool failure. Don't retry or treat it as an error to work around |
| `2` | Invalid configuration |
| `3` | Analysis failure (e.g. can't resolve the diff) |
| `4` | Unsupported invocation - not a git repository, bad arguments |

### Pre-commit hook

For a lighter-weight local gate that runs even outside an agent session:

```bash
#!/bin/sh
# .git/hooks/pre-commit - replace "main" with your default branch
loadbearing review --base main --head HEAD --no-policy
```

`--no-policy` here means the hook always exits 0 and just prints findings for awareness on every
local commit - it does not block commits, since architecture review is meant to happen at PR
time with real reviewers, not as a local gate a human/agent can't discuss. Drop `--no-policy`
only if your team deliberately wants local commits blocked too.

## What the agent should not do

Per the project's own principle (§3.6 of the spec this tool implements): LoadBearing identifies
decisions worth discussing, it doesn't make them. An agent should surface a HIGH/MEDIUM finding
to the human, not try to make it go away - not by editing `.loadbearing.yml` to lower a
detector's severity, not by adding a suppression, and not by picking itself as an authorized
reviewer. Those are exactly the human decisions this tool exists to protect.
