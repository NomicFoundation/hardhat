import os from "node:os";

import semver from "semver";

// The first solc version with official ARM64 Linux builds
export const FIRST_OFFICIAL_ARM64_SOLC_VERSION = "0.8.31";

/**
 * Determines if a solc version has an official ARM64 Linux build.
 */
export function hasOfficialArm64Build(version: string): boolean {
  return semver.gte(version, FIRST_OFFICIAL_ARM64_SOLC_VERSION);
}

/**
 * Returns true if running on a platform that doesn't have official native
 * solc builds for all versions (currently ARM64 Linux before 0.8.31).
 */
export function missesSomeOfficialNativeBuilds(): boolean {
  return os.platform() === "linux" && os.arch() === "arm64";
}

const defaultEvmTargets: { [key: string]: string } = {
  "0.5.1": "byzantium",
  "0.5.2": "byzantium",
  "0.5.3": "byzantium",
  "0.5.4": "byzantium",
  "0.5.5": "petersburg",
  "0.5.6": "petersburg",
  "0.5.7": "petersburg",
  "0.5.8": "petersburg",
  "0.5.9": "petersburg",
  "0.5.10": "petersburg",
  "0.5.11": "petersburg",
  "0.5.12": "petersburg",
  "0.5.13": "petersburg",
  "0.5.14": "istanbul",
  "0.5.15": "istanbul",
  "0.5.16": "istanbul",
  "0.5.17": "istanbul",
  "0.6.0": "istanbul",
  "0.6.1": "istanbul",
  "0.6.2": "istanbul",
  "0.6.3": "istanbul",
  "0.6.4": "istanbul",
  "0.6.5": "istanbul",
  "0.6.6": "istanbul",
  "0.6.7": "istanbul",
  "0.6.8": "istanbul",
  "0.6.9": "istanbul",
  "0.6.10": "istanbul",
  "0.6.11": "istanbul",
  "0.6.12": "istanbul",
  "0.7.0": "istanbul",
  "0.7.1": "istanbul",
  "0.7.2": "istanbul",
  "0.7.3": "istanbul",
  "0.7.4": "istanbul",
  "0.7.5": "istanbul",
  "0.7.6": "istanbul",
  "0.8.0": "istanbul",
  "0.8.1": "istanbul",
  "0.8.2": "istanbul",
  "0.8.3": "istanbul",
  "0.8.4": "istanbul",
  "0.8.5": "berlin",
  "0.8.6": "berlin",
  "0.8.7": "london",
  "0.8.8": "london",
  "0.8.9": "london",
  "0.8.10": "london",
  "0.8.11": "london",
  "0.8.12": "london",
  "0.8.13": "london",
  "0.8.14": "london",
  "0.8.15": "london",
  "0.8.16": "london",
  "0.8.17": "london",
  "0.8.18": "paris",
  "0.8.19": "paris",
  "0.8.20": "shanghai",
  "0.8.21": "shanghai",
  "0.8.22": "shanghai",
  "0.8.23": "shanghai",
  "0.8.24": "shanghai",
  "0.8.25": "cancun",
  "0.8.26": "cancun",
  "0.8.27": "cancun",
  "0.8.28": "cancun",
  "0.8.29": "cancun",
  "0.8.30": "prague",
  "0.8.31": "osaka",
  "0.8.32": "osaka",
  "0.8.33": "osaka",
};

export function getEvmVersionFromSolcVersion(
  solcVersion: string,
): string | undefined {
  return defaultEvmTargets[solcVersion];
}
