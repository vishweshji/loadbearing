#!/usr/bin/env node

import { runCli } from "./cli.js";

const { exitCode, stdout, stderr } = await runCli(process.argv.slice(2), process.cwd());

if (stdout.length > 0) process.stdout.write(stdout);
if (stderr.length > 0) process.stderr.write(stderr);

process.exit(exitCode);
