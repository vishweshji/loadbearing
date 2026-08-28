import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";

const packageDir = fileURLToPath(new URL("..", import.meta.url));

await esbuild.build({
  entryPoints: [`${packageDir}src/main.ts`],
  outfile: `${packageDir}dist/index.js`,
  bundle: true,
  platform: "node",
  target: "node20",
  format: "esm",
  banner: {
    js: "import { createRequire as __loadbearingCreateRequire } from 'node:module';\nconst require = __loadbearingCreateRequire(import.meta.url);",
  },
});

writeFileSync(`${packageDir}dist/package.json`, JSON.stringify({ type: "module" }, null, 2) + "\n");
