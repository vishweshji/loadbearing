export abstract class LoadBearingError extends Error {
  abstract readonly code: string;
}

export class ConfigurationError extends LoadBearingError {
  readonly code = "CONFIGURATION_ERROR";

  constructor(
    message: string,
    readonly location?: { file: string; line?: number; column?: number },
  ) {
    super(message);
    this.name = "ConfigurationError";
  }
}

export class RepositoryError extends LoadBearingError {
  readonly code = "REPOSITORY_ERROR";

  constructor(message: string) {
    super(message);
    this.name = "RepositoryError";
  }
}

export class DetectorError extends LoadBearingError {
  readonly code = "DETECTOR_ERROR";

  constructor(
    message: string,
    readonly detectorId: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "DetectorError";
  }
}

export class ApprovalError extends LoadBearingError {
  readonly code = "APPROVAL_ERROR";

  constructor(message: string) {
    super(message);
    this.name = "ApprovalError";
  }
}

export class LimitExceededError extends LoadBearingError {
  readonly code = "LIMIT_EXCEEDED_ERROR";

  constructor(message: string) {
    super(message);
    this.name = "LimitExceededError";
  }
}
