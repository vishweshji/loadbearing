import { basename } from "node:path";

export function isDockerfilePath(path: string): boolean {
  const name = basename(path);
  return name === "Dockerfile" || name.startsWith("Dockerfile.") || name.endsWith(".Dockerfile");
}
