import type { ChangedFile, DetectorContext } from "@loadbearing/core";
import { describe, expect, it } from "vitest";
import { LB003 } from "../detector.js";

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

describe("LB003 metadata", () => {
  it("has stable id and HIGH default severity", () => {
    expect(LB003.id).toBe("LB003");
    expect(LB003.defaultSeverity).toBe("high");
  });
});

describe("LB003 - Kubernetes", () => {
  it("flags a new Deployment (positive)", async () => {
    const findings = await LB003.detect(
      context([
        file("deploy/identity.yaml", {
          after:
            "apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: identity-service\nspec: {}\n",
        }),
      ]),
    );

    expect(findings).toHaveLength(1);
    expect(findings[0]?.severity).toBe("high");
    expect(findings[0]?.description).toContain("identity-service");
  });

  it("does not flag a Kubernetes Service (out of LB003's scope, that's LB005)", async () => {
    const findings = await LB003.detect(
      context([
        file("deploy/svc.yaml", {
          after: "apiVersion: v1\nkind: Service\nmetadata:\n  name: identity-svc\n",
        }),
      ]),
    );

    expect(findings).toHaveLength(0);
  });

  it("does not flag YAML without both apiVersion and kind (near-miss)", async () => {
    const findings = await LB003.detect(
      context([file("config/settings.yaml", { after: "kind: Deployment\nname: not-real\n" })]),
    );

    expect(findings).toHaveLength(0);
  });

  it("only flags a workload that is newly added, not a pre-existing one", async () => {
    const content = "apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: identity-service\n";
    const findings = await LB003.detect(
      context([
        file("deploy/identity.yaml", { status: "modified", before: content, after: content }),
      ]),
    );

    expect(findings).toHaveLength(0);
  });

  it("does not flag anything for a deleted manifest", async () => {
    const findings = await LB003.detect(
      context([
        file("deploy/identity.yaml", {
          status: "deleted",
          before: "apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: gone\n",
        }),
      ]),
    );

    expect(findings).toHaveLength(0);
  });

  it("attaches a newly added Dockerfile as supporting evidence", async () => {
    const findings = await LB003.detect(
      context([
        file("Dockerfile"),
        file("deploy/identity.yaml", {
          after: "apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: identity-service\n",
        }),
      ]),
    );

    expect(findings).toHaveLength(1);
    expect(findings[0]?.evidence.some((e) => e.file === "Dockerfile")).toBe(true);
  });
});

describe("LB003 - Dockerfile alone", () => {
  it("does not flag a bare new Dockerfile with no accompanying workload", async () => {
    const findings = await LB003.detect(context([file("Dockerfile")]));
    expect(findings).toHaveLength(0);
  });
});

describe("LB003 - Docker Compose", () => {
  it("flags a newly added compose service", async () => {
    const findings = await LB003.detect(
      context([
        file("docker-compose.yml", {
          before: "services:\n  web:\n    image: nginx\n",
          after: "services:\n  web:\n    image: nginx\n  worker:\n    image: worker:latest\n",
        }),
      ]),
    );

    expect(findings).toHaveLength(1);
    expect(findings[0]?.severity).toBe("high");
    expect(findings[0]?.description).toContain("worker");
  });

  it("does not flag an unchanged service list", async () => {
    const content = "services:\n  web:\n    image: nginx\n";
    const findings = await LB003.detect(
      context([
        file("docker-compose.yml", { status: "modified", before: content, after: content }),
      ]),
    );

    expect(findings).toHaveLength(0);
  });
});

describe("LB003 - Serverless", () => {
  it("flags a new function as MEDIUM", async () => {
    const findings = await LB003.detect(
      context([
        file("serverless.yml", {
          before: "functions:\n  hello:\n    handler: handler.hello\n",
          after:
            "functions:\n  hello:\n    handler: handler.hello\n  goodbye:\n    handler: handler.goodbye\n",
        }),
      ]),
    );

    expect(findings).toHaveLength(1);
    expect(findings[0]?.severity).toBe("medium");
  });
});
