import { LoadBearingError } from "@loadbearing/core";

export class GitHubContextError extends LoadBearingError {
  readonly code = "GITHUB_CONTEXT_ERROR";

  constructor(message: string) {
    super(message);
    this.name = "GitHubContextError";
  }
}
