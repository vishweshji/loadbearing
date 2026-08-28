# LB003 — New Deployable

## What it detects

The creation of a new independently deployed or independently scheduled runtime unit:

- A Kubernetes `Deployment`, `StatefulSet`, `DaemonSet`, `CronJob`, or `Job` object that didn't
  exist before.
- A new service entry under a Docker Compose file's `services:` key.
- A new function entry under a Serverless Framework `functions:` key.

A newly added `Dockerfile` is never flagged by itself — see below.

## What it intentionally does not detect

- A bare new `Dockerfile` with no accompanying workload manifest. Per the project's own
  philosophy, a Dockerfile alone is evidence, not certainty: plenty of Dockerfiles exist for
  local dev images, CI tooling, or documentation examples that are never deployed as an
  independent unit. When a new Dockerfile *is* added in the same change as a new Kubernetes
  workload or Compose service, it's attached as supporting evidence on that finding — it never
  generates a finding on its own.
- Modifications to an *existing* workload (image bump, resource limits, replica count). Only
  the creation of a new one is in scope.
- Whether the deployment topology itself is sound (this is not a Kubernetes best-practices
  linter).
- Non-Kubernetes, non-Compose, non-Serverless deployment systems (Nomad, ECS task definitions,
  Helm charts as such, CDK/Pulumi stacks) — not yet supported; see the project roadmap.

## Supported ecosystems

| Ecosystem  | Location                                              | Severity |
| ---------- | ------------------------------------------------------ | -------- |
| Kubernetes | any `*.yml`/`*.yaml` with an object whose `kind` is `Deployment`, `StatefulSet`, `DaemonSet`, `CronJob`, or `Job` | HIGH |
| Docker Compose | `docker-compose.yml`, `docker-compose.yaml`, `compose.yml`, `compose.yaml` | HIGH |
| Serverless Framework | `serverless.yml`, `serverless.yaml` | MEDIUM |

Kubernetes manifests are matched by content (an `apiVersion` + `kind` pair), not by filename or
directory, since Kubernetes manifests can live anywhere in a repository. A file is only
considered relevant if both fields are present, to avoid matching unrelated YAML.

## Default severity

`HIGH` for a new Kubernetes workload or Compose service; `MEDIUM` for a new Serverless function.

## Example

```text
LB003 New deployable workload

HIGH

deploy/identity-service.yaml

Introduces new Kubernetes Deployment: identity-service

Why this matters:
This creates a new independently deployed or scheduled runtime unit that must be operated,
monitored, and maintained.
```

## Known false positives

- A Kubernetes manifest checked into the repository purely as documentation or an example
  (not actually applied to any cluster) is indistinguishable from a real one.
- A multi-document YAML file where an unrelated document also happens to carry `apiVersion` +
  `kind: Job` (e.g. a Helm template) will be matched.

## Known false negatives

- Helm charts (`values.yaml` + templated manifests) are not evaluated — the templates aren't
  valid YAML on their own, so this detector can't see the workload they'll eventually render.
- A new deployable expressed through Nomad, ECS, CDK, Pulumi, or a Dockerfile alone (by design)
  is not detected in version 0.1.
