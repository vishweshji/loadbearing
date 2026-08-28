import type { ChangedFile, DetectorContext } from "@loadbearing/core";
import { describe, expect, it } from "vitest";
import { LB005 } from "../detector.js";

function file(path: string, overrides: Partial<ChangedFile> = {}): ChangedFile {
  return { path, status: "added", binary: false, truncated: false, ...overrides };
}

function context(changedFiles: ChangedFile[]): DetectorContext {
  return {
    repository: {
      root: "/fake",
      baseRevision: "base",
      headRevision: "head",
      async changedFiles() {
        return changedFiles;
      },
      async readAt() {
        return undefined;
      },
      async existsAt() {
        return false;
      },
    },
    changedFiles,
  };
}

describe("LB005 metadata", () => {
  it("has stable id and HIGH default severity", () => {
    expect(LB005.id).toBe("LB005");
    expect(LB005.defaultSeverity).toBe("high");
  });
});

describe("LB005 - Terraform", () => {
  it("flags a new resource block regardless of type (positive)", async () => {
    const findings = await LB005.detect(
      context([
        file("infra/storage.tf", {
          after: 'resource "aws_s3_bucket" "uploads" {\n  bucket = "my-uploads"\n}\n',
        }),
      ]),
    );

    expect(findings).toHaveLength(1);
    expect(findings[0]?.severity).toBe("high");
    expect(findings[0]?.description).toContain("aws_s3_bucket.uploads");
  });

  it("does not flag a data source (negative)", async () => {
    const findings = await LB005.detect(
      context([
        file("infra/data.tf", { after: 'data "aws_ami" "ubuntu" {\n  most_recent = true\n}\n' }),
      ]),
    );

    expect(findings).toHaveLength(0);
  });

  it("does not flag the word resource appearing outside a resource block (near-miss)", async () => {
    const findings = await LB005.detect(
      context([file("README.tf", { after: "# this module manages one resource type\n" })]),
    );

    expect(findings).toHaveLength(0);
  });

  it("only flags a newly introduced resource, not a pre-existing one", async () => {
    const content = 'resource "aws_s3_bucket" "uploads" {}\n';
    const findings = await LB005.detect(
      context([file("infra/storage.tf", { status: "modified", before: content, after: content })]),
    );

    expect(findings).toHaveLength(0);
  });

  it("does not flag anything for a deleted .tf file", async () => {
    const findings = await LB005.detect(
      context([
        file("infra/storage.tf", {
          status: "deleted",
          before: 'resource "aws_s3_bucket" "uploads" {}\n',
        }),
      ]),
    );

    expect(findings).toHaveLength(0);
  });
});

describe("LB005 - Kubernetes infrastructure", () => {
  it("flags a new Service", async () => {
    const findings = await LB005.detect(
      context([
        file("deploy/svc.yaml", {
          after: "apiVersion: v1\nkind: Service\nmetadata:\n  name: identity-svc\n",
        }),
      ]),
    );

    expect(findings).toHaveLength(1);
    expect(findings[0]?.description).toContain("identity-svc");
  });

  it("can legitimately co-fire alongside a Deployment in the same file (LB003 overlap)", async () => {
    const after = [
      "apiVersion: apps/v1",
      "kind: Deployment",
      "metadata:",
      "  name: identity",
      "---",
      "apiVersion: v1",
      "kind: Service",
      "metadata:",
      "  name: identity-svc",
    ].join("\n");

    const findings = await LB005.detect(context([file("deploy/all.yaml", { after })]));
    expect(findings).toHaveLength(1);
    expect(findings[0]?.description).toContain("Service");
  });
});

describe("LB005 - CloudFormation", () => {
  it("flags a new resource under Resources:", async () => {
    const before = "Resources:\n  Bucket:\n    Type: AWS::S3::Bucket\n";
    const after =
      "Resources:\n  Bucket:\n    Type: AWS::S3::Bucket\n  Queue:\n    Type: AWS::SQS::Queue\n";

    const findings = await LB005.detect(
      context([file("infra/template.yaml", { status: "modified", before, after })]),
    );

    expect(findings).toHaveLength(1);
    expect(findings[0]?.description).toContain("Queue");
  });

  it("does not treat an unrelated YAML file with a Resources key as CloudFormation", async () => {
    const findings = await LB005.detect(
      context([
        file("config/app.yaml", {
          after: "Resources:\n  limits:\n    cpu: 2\n",
        }),
      ]),
    );

    expect(findings).toHaveLength(0);
  });
});
