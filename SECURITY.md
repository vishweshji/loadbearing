# Security Policy

LoadBearing runs against source repositories, including untrusted pull requests from forks, and
is therefore supply-chain-sensitive tooling. It is designed around these constraints:

- LoadBearing never executes code from the repository it analyzes (no `npm install`, `pip
  install`, build tools, or repository configuration evaluated as code).
- LoadBearing parses YAML/TOML/JSON as inert data.
- Normal operation performs no network access and requires no LoadBearing account, token, or
  hosted service.
- The GitHub Action runs on the `pull_request` event with read-only permissions, never
  `pull_request_target`, and does not require repository secrets.

## Supported versions

Until the first stable 0.x line matures, only the latest published minor version receives
security fixes.

## Reporting a vulnerability

Please use [GitHub's private vulnerability reporting](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing/privately-reporting-a-security-vulnerability)
on this repository rather than opening a public issue. If private reporting is unavailable to
you, open a minimal public issue asking a maintainer to open a private channel — do not include
exploit details in that issue.

Do not publicly disclose a vulnerability, including proof-of-concept exploit details, before a
fix is available and coordinated disclosure has occurred.
