import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import { fixtureSchema, type Fixture } from "./fixtureSchema.js";

export interface DiscoveredFixture {
  dir: string;
  fixture: Fixture;
}

function findFixtureFiles(root: string): string[] {
  if (!existsSync(root)) return [];
  const results: string[] = [];
  for (const entry of readdirSync(root)) {
    const full = join(root, entry);
    if (statSync(full).isDirectory()) {
      if (entry === "before" || entry === "after") continue;
      const candidate = ["fixture.yml", "fixture.yaml"]
        .map((name) => join(full, name))
        .find((p) => existsSync(p));
      if (candidate !== undefined) {
        results.push(candidate);
      } else {
        results.push(...findFixtureFiles(full));
      }
    }
  }
  return results;
}

export function loadFixtures(root: string): DiscoveredFixture[] {
  return findFixtureFiles(root).map((path) => {
    const raw = parse(readFileSync(path, "utf8"), { strict: false });
    const fixture = fixtureSchema.parse(raw);
    return { dir: path.slice(0, path.lastIndexOf("/")), fixture };
  });
}
