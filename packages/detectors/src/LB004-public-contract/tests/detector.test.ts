import type { ChangedFile, DetectorContext } from "@loadbearing/core";
import { describe, expect, it } from "vitest";
import { LB004 } from "../detector.js";

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

const BASE_OPENAPI = `
openapi: "3.0.0"
info:
  title: Demo
  version: "1.0"
paths:
  /customers:
    get:
      summary: List customers
      responses:
        "200":
          description: ok
components:
  schemas:
    Customer:
      type: object
      properties:
        id:
          type: string
`;

describe("LB004 metadata", () => {
  it("has stable id and HIGH default severity", () => {
    expect(LB004.id).toBe("LB004");
    expect(LB004.defaultSeverity).toBe("high");
  });
});

describe("LB004 — OpenAPI", () => {
  it("flags a new endpoint as MEDIUM (positive)", async () => {
    const after = BASE_OPENAPI.replace(
      "paths:\n  /customers:",
      'paths:\n  /customers:\n    post:\n      responses:\n        "201":\n          description: created\n  /orders:',
    );
    const findings = await LB004.detect(
      context([file("api/openapi.yaml", { status: "modified", before: BASE_OPENAPI, after })]),
    );

    const newEndpoints = findings.filter((f) => f.severity === "medium");
    expect(newEndpoints.length).toBeGreaterThan(0);
  });

  it("does not flag an unchanged document (negative)", async () => {
    const findings = await LB004.detect(
      context([
        file("api/openapi.yaml", { status: "modified", before: BASE_OPENAPI, after: BASE_OPENAPI }),
      ]),
    );
    expect(findings).toHaveLength(0);
  });

  it("does not treat unrelated YAML as an OpenAPI document (near-miss)", async () => {
    const findings = await LB004.detect(
      context([
        file("config/settings.yaml", {
          after: "paths:\n  /customers:\n    get: {}\n",
        }),
      ]),
    );
    expect(findings).toHaveLength(0);
  });

  it("flags a removed endpoint as HIGH", async () => {
    const after = BASE_OPENAPI.replace(
      /paths:\n {2}\/customers:\n[\s\S]*?\ncomponents:/,
      "paths: {}\ncomponents:",
    );
    const findings = await LB004.detect(
      context([file("api/openapi.yaml", { status: "modified", before: BASE_OPENAPI, after })]),
    );

    const removed = findings.find((f) => f.description.includes("GET /customers"));
    expect(removed?.severity).toBe("high");
  });

  it("flags a modified shared schema as HIGH", async () => {
    const after = BASE_OPENAPI.replace(
      "        id:\n          type: string",
      "        id:\n          type: string\n        email:\n          type: string",
    );
    const findings = await LB004.detect(
      context([file("api/openapi.yaml", { status: "modified", before: BASE_OPENAPI, after })]),
    );

    const schemaChange = findings.find((f) => f.description === "Customer");
    expect(schemaChange?.severity).toBe("high");
  });

  it("does not flag anything for a deleted spec", async () => {
    const findings = await LB004.detect(
      context([file("api/openapi.yaml", { status: "deleted", before: BASE_OPENAPI })]),
    );
    expect(findings).toHaveLength(0);
  });
});

describe("LB004 — Protobuf", () => {
  it("flags a new message and a new rpc-carrying service", async () => {
    const findings = await LB004.detect(
      context([
        file("api/identity.proto", {
          after:
            "message Customer {\n  string id = 1;\n}\n\nservice Identity {\n  rpc Get(Customer) returns (Customer);\n}\n",
        }),
      ]),
    );

    expect(findings.length).toBeGreaterThanOrEqual(2);
    expect(findings.every((f) => f.severity === "high")).toBe(true);
  });

  it("does not flag an unchanged .proto file", async () => {
    const content = "message Customer {\n  string id = 1;\n}\n";
    const findings = await LB004.detect(
      context([
        file("api/identity.proto", { status: "modified", before: content, after: content }),
      ]),
    );
    expect(findings).toHaveLength(0);
  });

  it("flags a changed message body", async () => {
    const before = "message Customer {\n  string id = 1;\n}\n";
    const after = "message Customer {\n  string id = 1;\n  string email = 2;\n}\n";
    const findings = await LB004.detect(
      context([file("api/identity.proto", { status: "modified", before, after })]),
    );

    expect(findings).toHaveLength(1);
    expect(findings[0]?.description).toContain("Changed message Customer");
  });
});

describe("LB004 — GraphQL", () => {
  it("flags a new type", async () => {
    const findings = await LB004.detect(
      context([
        file("schema.graphql", {
          after: "type Customer {\n  id: ID!\n  email: String\n}\n",
        }),
      ]),
    );

    expect(findings).toHaveLength(1);
    expect(findings[0]?.severity).toBe("high");
  });

  it("flags a changed union", async () => {
    const before = "union SearchResult = Photo | Person\n";
    const after = "union SearchResult = Photo | Person | Video\n";
    const findings = await LB004.detect(
      context([file("schema.graphql", { status: "modified", before, after })]),
    );

    expect(findings).toHaveLength(1);
    expect(findings[0]?.description).toContain("union SearchResult");
  });

  it("does not flag an unrelated .md file mentioning GraphQL types", async () => {
    const findings = await LB004.detect(
      context([file("docs/schema-notes.md", { after: "type Customer { id: ID! }\n" })]),
    );
    expect(findings).toHaveLength(0);
  });
});
