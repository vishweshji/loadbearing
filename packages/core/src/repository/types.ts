export type ChangedFileStatus = "added" | "modified" | "deleted" | "renamed";

export interface ChangedFile {
  path: string;
  status: ChangedFileStatus;
  previousPath?: string;
  before?: string;
  after?: string;
  binary: boolean;
  truncated: boolean;
}

export interface Repository {
  readonly root: string;
  readonly baseRevision: string;
  readonly headRevision: string;

  changedFiles(): Promise<ChangedFile[]>;
  readAt(revision: string, path: string): Promise<string | undefined>;
  existsAt(revision: string, path: string): Promise<boolean>;
}
