# @loadbearing/mcp

An MCP ([Model Context Protocol](https://modelcontextprotocol.io)) server that exposes
LoadBearing's architecture review as native tools for MCP clients — Claude Code, Cursor, Claude
Desktop, and others — instead of the client having to shell out to the CLI.

Same engine, same detectors, same policy logic as the CLI and the GitHub Action. This is a third
front end over `@loadbearing/core` + `@loadbearing/detectors`, not a separate implementation.

## Tools

### `review`

Analyzes the diff between two git revisions in a repository and reports architectural impact —
the same output as `loadbearing review`.

| Input | Required | Default | Description |
| --- | --- | --- | --- |
| `path` | yes | — | Absolute path to the git repository to analyze |
| `base` | no | `HEAD~1` | Base revision to diff from |
| `head` | no | `HEAD` | Head revision to diff to |
| `config` | no | repo's own `.loadbearing.yml` | Path to a config file override |

### `explain`

Returns documentation for a detector ID (`LB001`–`LB005`): what it detects, its default
severity, and the file patterns it looks at.

| Input | Required | Description |
| --- | --- | --- |
| `detectorId` | yes | e.g. `"LB002"` |

## Running it

```bash
npx @loadbearing/mcp
```

It speaks MCP over stdio. See [docs/agents.md](../../docs/agents.md) for how to wire it into
Cursor or Claude Code specifically.

## Why a separate front end instead of wrapping the CLI

`@loadbearing/mcp` depends only on `@loadbearing/core` and `@loadbearing/detectors`, the same as
`@loadbearing/cli` and `@loadbearing/action` — it does not depend on the CLI package. This keeps
the dependency graph the same shape it already was (see [ARCHITECTURE.md](../../ARCHITECTURE.md)):
core and detectors are the shared foundation, and CLI/Action/MCP are three independent,
equally-privileged consumers of it.

## Local-first, still

Nothing here changes that guarantee: the server runs entirely on your machine, reads a local git
repository, and calls no external service. An MCP client can only ask it to analyze paths it's
given explicitly.
