import type { SolidityBuildProfileConfig } from "hardhat/types/config";

import { HardhatError } from "@nomicfoundation/hardhat-errors";

// TODO: Consider splitting this into two steps: collecting compiler versions
// and validating them. Version collection could be delegated to a helper
// from the build system.
/**
 * Returns the list of Solidity compiler versions defined in the given config,
 * including any overrides.
 *
 * Validates that all versions are supported by the Etherscan API (i.e., >= 0.4.11).
 * Throws an error if any unsupported versions are found.
 *
 * @param config The Solidity build profile configuration, including compilers
 * and optional overrides.
 * @returns An array of validated Solidity compiler version strings. The array
 * may contain duplicates if the same version is specified in both
 * `compilers` and `overrides`.
 * @throws HardhatError if any version is not supported by Etherscan.
 */
export async function resolveSupportedCompilerVersions({
  compilers,
  overrides,
}: SolidityBuildProfileConfig): Promise<string[]> {
  const compilerVersions = compilers.map(({ version }) => version);
  if (overrides !== undefined) {
    for (const { version } of Object.values(overrides)) {
      compilerVersions.push(version);
    }
  }

  // Etherscan only supports solidity versions higher than or equal to v0.4.11.
  // See https://etherscan.io/solcversions
  const supportedSolcVersionRange = ">=0.4.11";
  const semver = await import("semver");
  const unsupportedVersions = compilerVersions.filter(
    (version) => !semver.satisfies(version, supportedSolcVersionRange),
  );
  if (unsupportedVersions.length > 0) {
    throw new HardhatError(
      HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.SOLC_VERSION_NOT_SUPPORTED,
      {
        unsupportedVersions,
      },
    );
  }

  return compilerVersions;
}

/**
 * Filters the given versions, returning only those that satisfy the provided
 * semver range.
 *
 * @param versions An array of version strings (e.g. ["0.8.17", "0.4.25"])
 * @param range A semver range string (e.g. ">=0.4.11")
 * @returns An array of versions that satisfy the range.
 */
export async function filterVersionsByRange(
  versions: string[],
  range: string,
): Promise<string[]> {
  const semver = await import("semver");

  return versions.filter((version) => semver.satisfies(version, range));
}
