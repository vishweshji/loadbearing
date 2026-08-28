# LB005 - Infrastructure Resource

## What it detects

Introduction of persistent or operational infrastructure:

- A Terraform `resource "TYPE" "NAME" { ... }` block that didn't exist before, for **any**
  resource type - there is no hardcoded list of Terraform resource types to keep up to date.
- A Kubernetes `Service`, `Ingress`, `PersistentVolume`, `PersistentVolumeClaim`,
  `NetworkPolicy`, `Role`, `ClusterRole`, `RoleBinding`, or `ClusterRoleBinding` object that
  didn't exist before.
- A new logical resource under a CloudFormation/SAM template's `Resources:` key.

## What it intentionally does not detect

- Modifications to an *existing* resource (a Terraform resource's arguments changing, a
  Service's port changing). Only creation is in scope.
- Whether the resource choice itself is appropriate (cloud provider, instance size, IAM scope).
- Terraform `data` sources, `variable`, `output`, or `module` blocks - only `resource` blocks.
- Pulumi, AWS CDK, or other infrastructure-as-code systems that don't declare resources in a
  statically parseable resource-per-block form.

## Overlap with LB003

A Kubernetes `Service` fronting a newly introduced `Deployment` in the same change will
legitimately produce two separate findings - one from LB003 (the new workload) and one from
this detector (the new Service). That's intentional, not a bug: a workload and its
infrastructure are two different architectural decisions, per §19 of the spec this detector
implements.

## Supported ecosystems

| Ecosystem | Location | Matched by |
| --------- | -------- | ----------- |
| Terraform | `**/*.tf` | any `resource "TYPE" "NAME" { ... }` block |
| Kubernetes infrastructure | any `.yaml`/`.yml` | content (`apiVersion` + `kind` in the set above), not filename |
| CloudFormation/SAM | any `.yaml`/`.yml`/`.json` | content: a `Resources` map whose entries have a `Type` starting with `AWS::`, `Custom::`, or `Alexa::` |

## Default severity

`HIGH` for every match - the spec gives no differentiated tier for this detector.

## Example

```text
LB005 New infrastructure resource

HIGH

infra/storage.tf

Introduces new infrastructure resource: aws_s3_bucket.uploads

Why this matters:
This provisions persistent or operational infrastructure outside the application itself, which
typically has its own lifecycle, cost, and operational ownership.
```

## Known false positives

- A Terraform resource block appearing inside a comment or a heredoc string (e.g. embedded
  example code in a `.tf` file) would be matched, since detection is a text/regex scan, not a
  full HCL parser.
- A CloudFormation-shaped YAML/JSON document checked in purely as a documentation example.

## Known false negatives

- Terraform resources declared dynamically (e.g. via `dynamic` blocks generating resources at
  plan time, or resources defined only inside a module this repository doesn't contain) are not
  visible to a purely textual, single-file scan.
- Infrastructure declared through Pulumi, AWS CDK, Helm, or Nomad job files is not detected in
  version 0.1.
