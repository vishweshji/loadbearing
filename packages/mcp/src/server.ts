import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  DetectorRegistry,
  formatText,
  GitRepository,
  loadConfig,
  LoadBearingEngine,
  LOADBEARING_VERSION,
} from "@loadbearing/core";
import { builtInDetectors } from "@loadbearing/detectors";
import { z } from "zod";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function createServer(): McpServer {
  const server = new McpServer({ name: "loadbearing", version: LOADBEARING_VERSION });

  server.registerTool(
    "review",
    {
      title: "Review architectural impact",
      description:
        "Analyze the diff between two git revisions in a repository and report whether it " +
        "introduces a consequential architectural decision — a new external dependency, a " +
        "persistent schema change, a new deployable, a public contract change, or new " +
        "infrastructure. Call this before committing or opening a pull request to catch " +
        "high-impact changes early, the same way the LoadBearing CLI or GitHub Action would. " +
        "Most changes produce no findings and pass silently.",
      inputSchema: {
        path: z.string().describe("Absolute path to the git repository to analyze."),
        base: z
          .string()
          .default("HEAD~1")
          .describe('Base revision to diff from (e.g. "main", "HEAD~1", a commit SHA).'),
        head: z.string().default("HEAD").describe("Head revision to diff to."),
        config: z
          .string()
          .optional()
          .describe(
            "Path to a LoadBearing config file, if not the repository's own .loadbearing.yml.",
          ),
      },
    },
    async ({ path, base, head, config }) => {
      try {
        const loadedConfig = loadConfig(path, config !== undefined ? { configPath: config } : {});
        const repository = await GitRepository.create(path, base, head, {
          maxFileBytes: loadedConfig.limits.max_file_bytes,
        });
        const registry = new DetectorRegistry(builtInDetectors);
        const engine = new LoadBearingEngine({ repository, registry, config: loadedConfig });
        const { result } = await engine.run();

        return { content: [{ type: "text", text: formatText(result) }] };
      } catch (error) {
        return { content: [{ type: "text", text: errorMessage(error) }], isError: true };
      }
    },
  );

  server.registerTool(
    "explain",
    {
      title: "Explain a LoadBearing detector",
      description:
        "Print documentation for a LoadBearing detector ID (LB001-LB005): what it detects, " +
        "its default severity, and the file patterns it looks at.",
      inputSchema: {
        detectorId: z.string().describe('Detector ID, e.g. "LB002".'),
      },
    },
    async ({ detectorId }) => {
      const registry = new DetectorRegistry(builtInDetectors);
      const detector = registry.get(detectorId);

      if (detector === undefined) {
        const available = registry.all().map((d) => d.id);
        return {
          content: [
            {
              type: "text",
              text: `Unknown detector "${detectorId}". Available detectors: ${available.join(", ")}.`,
            },
          ],
          isError: true,
        };
      }

      const lines = [
        `${detector.id} ${detector.name}`,
        "",
        detector.description,
        "",
        `Default severity: ${detector.defaultSeverity.toUpperCase()}`,
      ];
      if (detector.supportedFiles !== undefined && detector.supportedFiles.length > 0) {
        lines.push("", "Supported files:", ...detector.supportedFiles);
      }

      return { content: [{ type: "text", text: lines.join("\n") }] };
    },
  );

  return server;
}
