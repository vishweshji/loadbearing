import { execFileSync } from "node:child_process";

export function isInsideGitWorkTree(cwd: string): boolean {
  try {
    const output = execFileSync("git", ["rev-parse", "--is-inside-work-tree"], {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return output === "true";
  } catch {
    return false;
  }
}
