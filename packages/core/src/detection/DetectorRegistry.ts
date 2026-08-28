import type { DetectorDefinition } from "./types.js";

export class DetectorRegistry {
  private readonly detectors = new Map<string, DetectorDefinition>();

  constructor(detectors: DetectorDefinition[] = []) {
    for (const detector of detectors) {
      this.register(detector);
    }
  }

  register(detector: DetectorDefinition): void {
    if (this.detectors.has(detector.id)) {
      throw new Error(`Detector ID "${detector.id}" is already registered.`);
    }
    this.detectors.set(detector.id, detector);
  }

  get(id: string): DetectorDefinition | undefined {
    return this.detectors.get(id);
  }

  all(): DetectorDefinition[] {
    return [...this.detectors.values()];
  }
}
