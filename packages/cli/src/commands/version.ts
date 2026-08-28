import { LOADBEARING_VERSION } from "@loadbearing/core";
import { EXIT_OK } from "../exitCodes.js";
import type { CommandOutcome } from "./review.js";

export function runVersion(): CommandOutcome {
  return { exitCode: EXIT_OK, stdout: `loadbearing ${LOADBEARING_VERSION}\n`, stderr: "" };
}
