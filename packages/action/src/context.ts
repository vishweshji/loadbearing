import type { PullRequestContext } from "@loadbearing/core";
import { GitHubContextError } from "./errors.js";

const SUPPORTED_EVENTS = new Set(["pull_request", "pull_request_review"]);

interface PullRequestPayload {
  number: number;
  user?: { login?: string };
  base?: { sha?: string };
  head?: { sha?: string };
}

export interface GitHubActionContext {
  eventName: string;
  payload: { pull_request?: PullRequestPayload };
  repo: { owner: string; repo: string };
}

export function resolvePullRequestContext(context: GitHubActionContext): PullRequestContext {
  if (!SUPPORTED_EVENTS.has(context.eventName)) {
    throw new GitHubContextError(
      `Unsupported event "${context.eventName}". LoadBearing runs on pull_request and ` +
        "pull_request_review.",
    );
  }

  const pr = context.payload.pull_request;
  if (pr === undefined) {
    throw new GitHubContextError(
      `The ${context.eventName} event payload does not contain a pull_request.`,
    );
  }

  const author = pr.user?.login;
  const baseSha = pr.base?.sha;
  const headSha = pr.head?.sha;

  if (author === undefined || baseSha === undefined || headSha === undefined) {
    throw new GitHubContextError(
      "Pull request payload is missing an author login, base SHA, or head SHA.",
    );
  }

  return {
    owner: context.repo.owner,
    repo: context.repo.repo,
    number: pr.number,
    author,
    baseSha,
    headSha,
  };
}
