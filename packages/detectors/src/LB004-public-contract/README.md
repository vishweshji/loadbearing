# LB004 — Public Contract Change

## What it detects

Changes to an interface other components, clients, or organizations may already depend on:

- **OpenAPI/Swagger**: a new endpoint (path+method), a modified endpoint, a removed endpoint, or
  a modified shared schema (`components.schemas` / Swagger 2.0 `definitions`).
- **Protocol Buffers** (`.proto`): a new or changed `service`, `message`, or `enum`.
- **GraphQL**: a new or changed `type`, `input`, `interface`, `enum`, or `union`.

## What it intentionally does not detect

- Whether a change is actually *breaking* in the semver/wire-compatibility sense. A contract
  change is reported as a change; it is not labeled "breaking" unless that's proven, per the
  project's evidence-before-opinion principle.
- Full protocol compatibility analysis for Protobuf (field number reuse, wire-type changes) —
  the purpose here is architectural visibility, not a compiler.
- AsyncAPI documents or ad hoc JSON Schema files. These are listed as future ecosystem work; see
  the detector's `description` field and the project roadmap.
- Purely additive OpenAPI schema definitions that no operation references yet (only
  *modifications* to an existing shared schema are flagged, not net-new unused ones).

## Supported ecosystems

| Ecosystem | Location | What's compared |
| --------- | -------- | ---------------- |
| OpenAPI/Swagger | any `.yaml`/`.yml`/`.json` whose parsed content has `openapi: "3.x"` or `swagger: "2.0"` | `paths` (per path+method) and `components.schemas`/`definitions` |
| Protobuf | `**/*.proto` | top-level `service`, `message`, `enum` blocks |
| GraphQL | `schema.graphql`, `schema.graphqls`, `**/*.graphql`, `**/*.graphqls` | top-level `type`, `input`, `interface`, `enum`, `union` |

OpenAPI/Swagger documents are matched by content, not filename, since they can be named
anything. Field-level comparisons use a key-order-independent deep comparison, so reformatting a
document (e.g. re-indenting, reordering keys) does not itself produce a finding.

## Default severity

For OpenAPI/Swagger:

```text
new endpoint                MEDIUM
existing contract modified  HIGH
endpoint removed            HIGH
shared schema modified      HIGH
```

Protobuf and GraphQL changes are `HIGH` uniformly — the spec gives no differentiated severity
tier for those formats the way it does for OpenAPI.

## Example

```text
LB004 OpenAPI contract change

HIGH

api/openapi.yaml

PUT /customers/{id}

Why this matters:
Other components, clients, or organizations may already depend on this interface. Changing it
can break consumers that were never part of this change.
```

## Known false positives

- A cosmetic OpenAPI operation change that alters only a `description`/`summary` field is
  treated the same as a change to the request/response schema, since both live under the same
  operation object being deep-compared.
- A GraphQL/Protobuf construct whose only change is a comment inside the block (if the comment
  syntax isn't stripped) will be reported as "changed."

## Known false negatives

- AsyncAPI documents and standalone JSON Schema contract files are not evaluated in version 0.1.
- A Protobuf field number or type change nested inside an otherwise-untouched-looking block is
  only detected if it falls within a top-level `message`/`enum`/`service` block; deeply nested
  message-within-message redefinitions are tracked as part of their enclosing block's body, not
  as independently named constructs.
- Renaming an OpenAPI path or GraphQL type is reported as one removal and one addition, not a
  rename.
