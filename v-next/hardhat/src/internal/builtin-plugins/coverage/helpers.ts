import path from "node:path";

export function getCoveragePath(rootPath: string): string {
  return path.join(rootPath, "coverage");
}
