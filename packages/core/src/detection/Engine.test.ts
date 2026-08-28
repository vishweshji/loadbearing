import { describe, expect, it } from "vitest";
import { defaultConfig } from "../config/schema.js";
import { DetectorError, LimitExceededError } from "../errors.js";
import type { ChangedFile, Repository } from "../repository/types.js";
import type { Finding } from "../result/types.js";
import { DetectorRegistry } from "./DetectorRegistry.js";
import { LoadBearingEngine } from "./Engine.js";
import type { DetectorContext, DetectorDefinition } from "./types.js";

class FakeRepository implements Repository {
  readonly root = "/fake";
  readonly baseRevision = "base-sha";
  readonly headRevision = "head-sha";

  constructor(private readonly files: ChangedFile[]) {}

  async changedFiles(): Promise<ChangedFile[]> {
    return this.files;
  }

  async readAt(): Promise<string | undefined> {
    return undefined;
  }

  async existsAt(): Promise<boolean> {
    return false;
  }
}

function changedFile(path: string, overrides: Partial<ChangedFile> = {}): ChangedFile {
  return { path, status: "added", binary: false, truncated: false, ...overrides };
}

function findingDetector(
  id: string,
  build: (context: DetectorContext) => Finding[],
): DetectorDefinition {
  return {
    id,
    name: id,
    description: id,
    defaultSeverity: "medium",
    async detect(context) {
      return build(context);
    },
  };
}

function dependencyFinding(id: string, file: string): Finding {
  return {
    detectorId: id,
    category: "external-dependency",
    severity: "medium",
    confidence: 1,
    title: "New external dependency",
    description: "Adds runtime dependency",
    rationale: "reason",
    evidence: [{ file, kind: "manifest-change", description: "added" }],
  };
}

describe("LoadBearingEngine", () => {
  it("aggregates findings from all enabled detectors into a ReviewResult", async () => {
    const repository = new FakeRepository([changedFile("package.json")]);
    const registry = new DetectorRegistry([
      findingDetector("LB001", () => [dependencyFinding("LB001", "package.json")]),
    ]);
    const config = defaultConfig();

    const engine = new LoadBearingEngine({ repository, registry, config });
    const { result } = await engine.run();

    expect(result.findings).toHaveLength(1);
    expect(result.impact).toBe("medium");
    expect(result.baseSha).toBe("base-sha");
    expect(result.headSha).toBe("head-sha");
    expect(result.stats.detectorsRun).toBe(1);
  });

  it("excludes ignored files from what detectors see, and reports the counts", async () => {
    const seenPaths: string[] = [];
    const repository = new FakeRepository([
      changedFile("vendor/lib.js"),
      changedFile("src/index.ts"),
    ]);
    const registry = new DetectorRegistry([
      findingDetector("LB001", (context) => {
        seenPaths.push(...context.changedFiles.map((f) => f.path));
        return [];
      }),
    ]);
    const config = defaultConfig();
    config.ignore.paths = ["vendor/**"];

    const engine = new LoadBearingEngine({ repository, registry, config });
    const { result } = await engine.run();

    expect(seenPaths).toEqual(["src/index.ts"]);
    expect(result.stats.changedFiles).toBe(2);
    expect(result.stats.ignoredFiles).toBe(1);
    expect(result.stats.analyzedFiles).toBe(1);
  });

  it("does not run a detector that is disabled in configuration", async () => {
    let ran = false;
    const repository = new FakeRepository([changedFile("package.json")]);
    const registry = new DetectorRegistry([
      findingDetector("LB001", () => {
        ran = true;
        return [];
      }),
    ]);
    const config = defaultConfig();
    config.detectors.LB001 = { enabled: false };

    const engine = new LoadBearingEngine({ repository, registry, config });
    await engine.run();

    expect(ran).toBe(false);
  });

  it("applies a configured severity override to findings and overall impact", async () => {
    const repository = new FakeRepository([changedFile("package.json")]);
    const registry = new DetectorRegistry([
      findingDetector("LB001", () => [dependencyFinding("LB001", "package.json")]),
    ]);
    const config = defaultConfig();
    config.detectors.LB001 = { enabled: true, severity: "high" };

    const engine = new LoadBearingEngine({ repository, registry, config });
    const { result } = await engine.run();

    expect(result.findings[0]?.severity).toBe("high");
    expect(result.impact).toBe("high");
  });

  it("removes suppressed findings before computing impact", async () => {
    const repository = new FakeRepository([changedFile("tools/package.json")]);
    const registry = new DetectorRegistry([
      findingDetector("LB001", () => [dependencyFinding("LB001", "tools/package.json")]),
    ]);
    const config = defaultConfig();
    config.suppressions = [
      { detector: "LB001", path: "tools/package.json", reason: "dev tooling only" },
    ];

    const engine = new LoadBearingEngine({ repository, registry, config });
    const { result } = await engine.run();

    expect(result.findings).toHaveLength(0);
    expect(result.impact).toBe("none");
  });

  it("fails the whole analysis when a detector throws, rather than reporting a false pass", async () => {
    const repository = new FakeRepository([changedFile("db/migrations/1.sql")]);
    const registry = new DetectorRegistry([
      findingDetector("LB002", () => {
        throw new Error("malformed SQL, cannot parse safely");
      }),
    ]);
    const config = defaultConfig();

    const engine = new LoadBearingEngine({ repository, registry, config });
    await expect(engine.run()).rejects.toThrow(DetectorError);
  });

  it("fails analysis when the analyzed file count exceeds the configured limit", async () => {
    const files = Array.from({ length: 5 }, (_, i) => changedFile(`file-${i}.txt`));
    const repository = new FakeRepository(files);
    const registry = new DetectorRegistry([]);
    const config = defaultConfig();
    config.limits.max_changed_files = 3;

    const engine = new LoadBearingEngine({ repository, registry, config });
    await expect(engine.run()).rejects.toThrow(LimitExceededError);
  });

  it("does not count ignored files against the max_changed_files limit", async () => {
    const files = [
      ...Array.from({ length: 5 }, (_, i) => changedFile(`vendor/file-${i}.txt`)),
      changedFile("src/index.ts"),
    ];
    const repository = new FakeRepository(files);
    const registry = new DetectorRegistry([]);
    const config = defaultConfig();
    config.ignore.paths = ["vendor/**"];
    config.limits.max_changed_files = 3;

    const engine = new LoadBearingEngine({ repository, registry, config });
    const { result } = await engine.run();

    expect(result.stats.analyzedFiles).toBe(1);
  });
});
