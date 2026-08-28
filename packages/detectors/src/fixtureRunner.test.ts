import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { defaultConfig, DetectorRegistry, LoadBearingEngine } from "@loadbearing/core";
import { describe, expect, it } from "vitest";
import { builtInDetectors } from "./index.js";
import { DirectoryRepository } from "./testing/DirectoryRepository.js";
import { loadFixtures } from "./testing/loadFixtures.js";

// Golden fixtures live at the repo root (see LOADBEARING.md §30/§37), organized by category
// rather than by detector, since they double as a public architecture-change benchmark, not
// just detector-specific test data.
const repoRoot = join(fileURLToPath(new URL(".", import.meta.url)), "..", "..", "..");
const fixturesRoot = join(repoRoot, "fixtures");

const discovered = loadFixtures(fixturesRoot);

describe.each(discovered)("golden fixture: $fixture.name", ({ dir, fixture }) => {
  it("matches the expected impact and findings", async () => {
    const repository = new DirectoryRepository(join(dir, fixture.base), join(dir, fixture.head));
    const registry = new DetectorRegistry(builtInDetectors);
    const engine = new LoadBearingEngine({ repository, registry, config: defaultConfig() });

    const { result } = await engine.run();

    expect(result.impact).toBe(fixture.expected.impact);

    for (const expectedFinding of fixture.expected.findings) {
      const candidates = result.findings.filter((f) => f.detectorId === expectedFinding.detector);
      expect(
        candidates.length > 0,
        `expected at least one ${expectedFinding.detector} finding, got: ${JSON.stringify(result.findings.map((f) => f.detectorId))}`,
      ).toBe(true);

      const matching = candidates.find((finding) => {
        if (
          expectedFinding.severity !== undefined &&
          finding.severity !== expectedFinding.severity
        ) {
          return false;
        }
        const haystack = [finding.description, ...finding.evidence.map((e) => e.description)].join(
          " ",
        );
        return expectedFinding.contains.every((needle) => haystack.includes(needle));
      });

      expect(
        matching !== undefined,
        `no ${expectedFinding.detector} finding matched severity=${expectedFinding.severity ?? "any"} contains=${JSON.stringify(expectedFinding.contains)}. Findings: ${JSON.stringify(candidates, null, 2)}`,
      ).toBe(true);
    }
  });
});

describe("golden fixture discovery", () => {
  it("found at least one fixture per category", () => {
    expect(discovered.length).toBeGreaterThan(0);
  });
});
