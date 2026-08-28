import type { ChangedFile, Repository } from "../repository/types.js";
import type { Finding, Severity } from "../result/types.js";

export interface DetectorContext {
  repository: Repository;
  changedFiles: ChangedFile[];
}

export interface DetectorDefinition {
  id: string;
  name: string;
  description: string;
  defaultSeverity: Severity;
  supportedFiles?: string[];
  detect(context: DetectorContext): Promise<Finding[]>;
}

export type Detector = DetectorDefinition;
