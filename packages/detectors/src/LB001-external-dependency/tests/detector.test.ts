import type { ChangedFile, DetectorContext } from "@loadbearing/core";
import { describe, expect, it } from "vitest";
import { LB001 } from "../detector.js";

function file(path: string, overrides: Partial<ChangedFile> = {}): ChangedFile {
  return { path, status: "modified", binary: false, truncated: false, ...overrides };
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

describe("LB001 metadata", () => {
  it("has stable id, MEDIUM default severity, and a plugin-shaped definition", () => {
    expect(LB001.id).toBe("LB001");
    expect(LB001.defaultSeverity).toBe("medium");
    expect(typeof LB001.detect).toBe("function");
  });
});

describe("LB001 — package.json", () => {
  it("flags a newly added runtime dependency (positive)", async () => {
    const findings = await LB001.detect(
      context([
        file("package.json", {
          status: "added",
          after: JSON.stringify({ dependencies: { "@auth0/node": "^5.1.0" } }),
        }),
      ]),
    );

    expect(findings).toHaveLength(1);
    expect(findings[0]?.severity).toBe("medium");
    expect(findings[0]?.description).toContain("@auth0/node");
  });

  it("flags a new devDependency as LOW severity", async () => {
    const findings = await LB001.detect(
      context([
        file("package.json", {
          status: "modified",
          before: JSON.stringify({ devDependencies: {} }),
          after: JSON.stringify({ devDependencies: { vitest: "^3.0.0" } }),
        }),
      ]),
    );

    expect(findings).toHaveLength(1);
    expect(findings[0]?.severity).toBe("low");
  });

  it("does not flag a version bump on an existing dependency (negative)", async () => {
    const findings = await LB001.detect(
      context([
        file("package.json", {
          before: JSON.stringify({ dependencies: { left: "1.0.0" } }),
          after: JSON.stringify({ dependencies: { left: "2.0.0" } }),
        }),
      ]),
    );

    expect(findings).toHaveLength(0);
  });

  it("does not flag package.json content appearing in an unrelated file (near-miss)", async () => {
    const findings = await LB001.detect(
      context([
        file("docs/example-package.json.md", {
          status: "added",
          after: '```json\n{"dependencies": {"left-pad": "1.0.0"}}\n```\n',
        }),
      ]),
    );

    expect(findings).toHaveLength(0);
  });

  it("does not flag anything when the file is deleted", async () => {
    const findings = await LB001.detect(
      context([
        file("package.json", {
          status: "deleted",
          before: JSON.stringify({ dependencies: { left: "1.0.0" } }),
        }),
      ]),
    );

    expect(findings).toHaveLength(0);
  });

  it("skips a package.json that fails to parse rather than throwing", async () => {
    const findings = await LB001.detect(
      context([file("package.json", { status: "added", after: "{ not valid json" })]),
    );

    expect(findings).toHaveLength(0);
  });
});

describe("LB001 — Python", () => {
  it("flags a new dependency in requirements.txt as MEDIUM", async () => {
    const findings = await LB001.detect(
      context([
        file("requirements.txt", {
          before: "requests==2.31.0\n",
          after: "requests==2.31.0\nblack==24.1.0\n",
        }),
      ]),
    );

    expect(findings).toHaveLength(1);
    expect(findings[0]?.severity).toBe("medium");
  });

  it("flags a new dependency in requirements-dev.txt as LOW", async () => {
    const findings = await LB001.detect(
      context([
        file("requirements-dev.txt", {
          status: "added",
          after: "pytest==8.0.0\n",
        }),
      ]),
    );

    expect(findings).toHaveLength(1);
    expect(findings[0]?.severity).toBe("low");
  });

  it("flags a new pyproject.toml project dependency", async () => {
    const findings = await LB001.detect(
      context([
        file("pyproject.toml", {
          before: '[project]\ndependencies = ["requests>=2.31"]\n',
          after: '[project]\ndependencies = ["requests>=2.31", "httpx>=0.27"]\n',
        }),
      ]),
    );

    expect(findings).toHaveLength(1);
    expect(findings[0]?.severity).toBe("medium");
  });

  it("flags a new poetry dev group dependency as LOW and excludes the python constraint", async () => {
    const findings = await LB001.detect(
      context([
        file("pyproject.toml", {
          status: "added",
          after: [
            "[tool.poetry.dependencies]",
            'python = "^3.11"',
            "",
            "[tool.poetry.group.dev.dependencies]",
            'pytest = "^8.0"',
          ].join("\n"),
        }),
      ]),
    );

    expect(findings).toHaveLength(1);
    expect(findings[0]?.severity).toBe("low");
    expect(findings[0]?.description).toContain("pytest");
  });

  it("does not flag requirements content inside a README (near-miss)", async () => {
    const findings = await LB001.detect(
      context([
        file("README.md", {
          status: "added",
          after: "Install with:\n\n    requests==2.31.0\n",
        }),
      ]),
    );

    expect(findings).toHaveLength(0);
  });
});

describe("LB001 — Go", () => {
  it("flags a newly added go.mod requirement", async () => {
    const findings = await LB001.detect(
      context([
        file("go.mod", {
          before: "module example.com/thing\n\ngo 1.22\n",
          after:
            "module example.com/thing\n\ngo 1.22\n\nrequire (\n\tgithub.com/pkg/errors v0.9.1\n)\n",
        }),
      ]),
    );

    expect(findings).toHaveLength(1);
    expect(findings[0]?.severity).toBe("medium");
    expect(findings[0]?.description).toContain("github.com/pkg/errors");
  });

  it("does not flag an existing requirement whose version changed", async () => {
    const findings = await LB001.detect(
      context([
        file("go.mod", {
          before: "require github.com/pkg/errors v0.9.0\n",
          after: "require github.com/pkg/errors v0.9.1\n",
        }),
      ]),
    );

    expect(findings).toHaveLength(0);
  });
});

describe("LB001 — Rust", () => {
  it("flags a newly added Cargo.toml runtime dependency", async () => {
    const findings = await LB001.detect(
      context([
        file("Cargo.toml", {
          before: "[dependencies]\n",
          after: '[dependencies]\nserde = "1.0"\n',
        }),
      ]),
    );

    expect(findings).toHaveLength(1);
    expect(findings[0]?.severity).toBe("medium");
  });

  it("flags a newly added dev-dependency as LOW", async () => {
    const findings = await LB001.detect(
      context([
        file("Cargo.toml", {
          status: "added",
          after: '[dev-dependencies]\ncriterion = "0.5"\n',
        }),
      ]),
    );

    expect(findings).toHaveLength(1);
    expect(findings[0]?.severity).toBe("low");
  });

  it("skips a Cargo.toml that fails to parse rather than throwing", async () => {
    const findings = await LB001.detect(
      context([file("Cargo.toml", { status: "added", after: "not = [valid toml" })]),
    );

    expect(findings).toHaveLength(0);
  });
});
