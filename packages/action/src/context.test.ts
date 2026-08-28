import { describe, expect, it } from "vitest";
import { GitHubContextError } from "./errors.js";
import { resolvePullRequestContext, type GitHubActionContext } from "./context.js";

function pullRequestEvent(
  overrides: Partial<GitHubActionContext["payload"]["pull_request"]> = {},
): GitHubActionContext {
  return {
    eventName: "pull_request",
    repo: { owner: "loadbearing-dev", repo: "loadbearing" },
    payload: {
      pull_request: {
        number: 42,
        user: { login: "alice" },
        base: { sha: "base-sha" },
        head: { sha: "head-sha" },
        ...overrides,
      },
    },
  };
}

describe("resolvePullRequestContext", () => {
  it("resolves a pull_request event fixture payload", () => {
    const result = resolvePullRequestContext(pullRequestEvent());

    expect(result).toEqual({
      owner: "loadbearing-dev",
      repo: "loadbearing",
      number: 42,
      author: "alice",
      baseSha: "base-sha",
      headSha: "head-sha",
    });
  });

  it("resolves a pull_request_review event fixture payload", () => {
    const event = pullRequestEvent();
    event.eventName = "pull_request_review";

    const result = resolvePullRequestContext(event);
    expect(result.number).toBe(42);
  });

  it("rejects an unsupported event", () => {
    const event = pullRequestEvent();
    event.eventName = "push";

    expect(() => resolvePullRequestContext(event)).toThrow(GitHubContextError);
  });

  it("rejects a payload with no pull_request", () => {
    expect(() =>
      resolvePullRequestContext({
        eventName: "pull_request",
        repo: { owner: "o", repo: "r" },
        payload: {},
      }),
    ).toThrow(GitHubContextError);
  });

  it("rejects a payload missing base or head SHA", () => {
    const event = pullRequestEvent();
    delete event.payload.pull_request?.base;
    expect(() => resolvePullRequestContext(event)).toThrow(GitHubContextError);
  });
});
