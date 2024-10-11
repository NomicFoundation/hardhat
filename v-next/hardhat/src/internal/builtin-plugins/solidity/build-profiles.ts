export const DEFAULT_BUILD_PROFILE = "default";

export const DEFAULT_BUILD_PROFILES = [
  "default",
  "production",
  "solidity-tests",
  "javascript-tests",
] as const;

export function shouldMergeCompilationJobs(buildProfile: string): boolean {
  return buildProfile !== "production";
}
