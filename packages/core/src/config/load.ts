import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { LineCounter, parseDocument } from "yaml";
import type { ZodError, ZodIssue } from "zod";
import { ConfigurationError } from "../errors.js";
import { defaultConfig, loadBearingConfigSchema, type LoadBearingConfig } from "./schema.js";

const CONFIG_FILENAMES = [".loadbearing.yml", ".loadbearing.yaml"];

export interface LoadConfigOptions {
  configPath?: string;
}

export function resolveConfigPath(
  root: string,
  options: LoadConfigOptions = {},
): string | undefined {
  if (options.configPath !== undefined) {
    if (!existsSync(options.configPath)) {
      throw new ConfigurationError(`Configuration file not found: ${options.configPath}`);
    }
    return options.configPath;
  }

  const found = CONFIG_FILENAMES.map((name) => join(root, name)).filter((path) => existsSync(path));

  if (found.length > 1) {
    throw new ConfigurationError(
      `Found both ${CONFIG_FILENAMES.join(" and ")} in ${root}. ` +
        "LoadBearing supports only one configuration file per repository; remove one.",
    );
  }

  return found[0];
}

function locate(
  doc: ReturnType<typeof parseDocument>,
  lineCounter: LineCounter,
  path: (string | number)[],
): { line: number; column: number } | undefined {
  try {
    const node = doc.getIn(path, true);
    const range =
      node && typeof node === "object" && "range" in node
        ? (node as { range?: [number, number, number] }).range
        : undefined;
    if (!range) return undefined;
    const pos = lineCounter.linePos(range[0]);
    return { line: pos.line, column: pos.col };
  } catch {
    return undefined;
  }
}

function toPathArray(path: readonly PropertyKey[]): (string | number)[] {
  return path.map((segment) => (typeof segment === "symbol" ? segment.toString() : segment));
}

function formatIssue(
  issue: ZodIssue,
  filePath: string,
  doc: ReturnType<typeof parseDocument>,
  lineCounter: LineCounter,
): string {
  const path = toPathArray(issue.path);
  const fieldPath = path.join(".") || "(root)";
  const position = locate(doc, lineCounter, path);
  const location = position ? `${filePath}:${position.line}` : filePath;
  return `${location}\n\n${fieldPath} ${issue.message}`;
}

function formatZodError(
  error: ZodError,
  filePath: string,
  doc: ReturnType<typeof parseDocument>,
  lineCounter: LineCounter,
): string {
  return error.issues
    .map((issue) => formatIssue(issue, filePath, doc, lineCounter))
    .join("\n\n---\n\n");
}

export function loadConfig(root: string, options: LoadConfigOptions = {}): LoadBearingConfig {
  const configPath = resolveConfigPath(root, options);
  if (configPath === undefined) {
    return defaultConfig();
  }

  const text = readFileSync(configPath, "utf8");
  const lineCounter = new LineCounter();
  const doc = parseDocument(text, { lineCounter });

  if (doc.errors.length > 0) {
    const firstError = doc.errors[0];
    throw new ConfigurationError(
      `${configPath}\n\nInvalid YAML: ${firstError?.message ?? "unknown parse error"}`,
    );
  }

  const raw: unknown = doc.toJS();
  const result = loadBearingConfigSchema.safeParse(raw);

  if (!result.success) {
    throw new ConfigurationError(formatZodError(result.error, configPath, doc, lineCounter));
  }

  return result.data;
}
