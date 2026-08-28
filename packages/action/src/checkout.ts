import { execFileSync } from "node:child_process";

function commitExists(workspace: string, sha: string): boolean {
  try {
    execFileSync("git", ["cat-file", "-e", `${sha}^{commit}`], { cwd: workspace, stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

// actions/checkout's default ref isn't reliably the PR head on a pull_request_review event, so
// fetch it explicitly rather than depending on the consuming workflow's checkout step.
export function ensurePullRequestCommitsAvailable(
  workspace: string,
  prNumber: number,
  shas: string[],
): void {
  if (shas.every((sha) => commitExists(workspace, sha))) return;

  execFileSync(
    "git",
    [
      "fetch",
      "--no-tags",
      "--force",
      "origin",
      `+refs/pull/${prNumber}/head:refs/loadbearing/pr-${prNumber}-head`,
    ],
    { cwd: workspace, stdio: "ignore" },
  );
}
