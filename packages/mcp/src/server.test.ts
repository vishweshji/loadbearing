import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createServer } from "./server.js";

let dir: string;
let client: Client;

function git(cwd: string, args: string[]): string {
  return execFileSync(
    "git",
    ["-c", "user.email=test@example.com", "-c", "user.name=test", ...args],
    { cwd, encoding: "utf8" },
  ).trim();
}

beforeEach(async () => {
  dir = mkdtempSync(join(tmpdir(), "loadbearing-mcp-"));
  git(dir, ["init", "--initial-branch=main"]);
  writeFileSync(join(dir, "README.md"), "hello\n");
  git(dir, ["add", "."]);
  git(dir, ["commit", "-m", "initial commit"]);

  const server = createServer();
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  client = new Client({ name: "test-client", version: "0.0.0" });
  await Promise.all([client.connect(clientTransport), server.connect(serverTransport)]);
});

afterEach(async () => {
  await client.close();
  rmSync(dir, { recursive: true, force: true });
});

describe("MCP server - review tool", () => {
  it("lists review and explain among the available tools", async () => {
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name);
    expect(names).toContain("review");
    expect(names).toContain("explain");
  });

  it("reports no findings for a clean change", async () => {
    git(dir, ["checkout", "-b", "feature"]);
    writeFileSync(join(dir, "notes.txt"), "notes\n");
    git(dir, ["add", "."]);
    git(dir, ["commit", "-m", "add notes"]);

    const result = await client.callTool({
      name: "review",
      arguments: { path: dir, base: "main", head: "feature" },
    });

    expect(result.isError).toBeFalsy();
    const content = result.content as Array<{ type: string; text: string }>;
    expect(content[0]?.text).toContain("Architecture impact: NONE");
  });

  it("reports a HIGH finding for a new persistent schema change", async () => {
    git(dir, ["checkout", "-b", "feature"]);
    mkdirSync(join(dir, "db", "migrations"), { recursive: true });
    writeFileSync(
      join(dir, "db/migrations/001.sql"),
      "CREATE TABLE customer_identity (id UUID PRIMARY KEY);\n",
    );
    git(dir, ["add", "."]);
    git(dir, ["commit", "-m", "add migration"]);

    const result = await client.callTool({
      name: "review",
      arguments: { path: dir, base: "main", head: "feature" },
    });

    const content = result.content as Array<{ type: string; text: string }>;
    expect(content[0]?.text).toContain("Architecture impact: HIGH");
    expect(content[0]?.text).toContain("customer_identity");
  });

  it("returns an error result for an unresolvable revision rather than throwing", async () => {
    const result = await client.callTool({
      name: "review",
      arguments: { path: dir, base: "does-not-exist", head: "main" },
    });

    expect(result.isError).toBe(true);
  });
});

describe("MCP server - explain tool", () => {
  it("returns detector metadata for a known ID", async () => {
    const result = await client.callTool({ name: "explain", arguments: { detectorId: "LB001" } });
    const content = result.content as Array<{ type: string; text: string }>;
    expect(content[0]?.text).toContain("LB001");
  });

  it("returns an error result for an unknown detector ID", async () => {
    const result = await client.callTool({
      name: "explain",
      arguments: { detectorId: "LB999" },
    });
    expect(result.isError).toBe(true);
  });
});
