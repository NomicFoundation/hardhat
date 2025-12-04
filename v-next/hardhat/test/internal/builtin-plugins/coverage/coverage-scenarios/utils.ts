import path from "node:path";

export function getTestScenarioFileRelativePath(folderName: string): string {
  return path.join(
    "test",
    "internal",
    "builtin-plugins",
    "coverage",
    "coverage-scenarios",
    folderName,
    "Coverage.sol",
  );
}
