import type { InferredSolcVersion } from "./metadata.js";
import type { SemverVersion } from "@nomicfoundation/hardhat-utils/fast-semver";
import type { SolidityBuildProfileConfig } from "hardhat/types/config";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import {
  equals,
  greaterThanOrEqual,
  lowerThan,
  lowerThanOrEqual,
  parseVersion,
} from "@nomicfoundation/hardhat-utils/fast-semver";

// Etherscan only supports solidity versions higher than or equal to v0.4.11.
// See https://etherscan.io/solcversions
const MIN_SUPPORTED_SOLC_VERSION: SemverVersion = [0, 4, 11];

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
export function resolveSupportedSolcVersions({
  compilers,
  overrides,
}: SolidityBuildProfileConfig): string[] {
  const solcVersions = compilers.map(({ version }) => version);
  if (overrides !== undefined) {
    for (const { version } of Object.values(overrides)) {
      solcVersions.push(version);
    }
  }

  const unsupportedSolcVersions = solcVersions.filter((version) => {
    const parsed = parseVersion(version);
    return parsed === undefined || lowerThan(parsed, MIN_SUPPORTED_SOLC_VERSION);
  });
  if (unsupportedSolcVersions.length > 0) {
    throw new HardhatError(
      HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.SOLC_VERSION_NOT_SUPPORTED,
      {
        unsupportedSolcVersions,
      },
    );
  }

  return solcVersions;
}

/**
 * Filters the given versions, returning only those compatible with the
 * `InferredSolcVersion` extracted from the deployed bytecode.
 *
 * @param versions An array of version strings (e.g. `["0.8.17", "0.4.25"]`).
 * @param inferred The version inferred from the deployed bytecode metadata.
 * @returns The subset of `versions` that fall within the inferred constraint.
 */
export function filterVersionsByInferred(
  versions: string[],
  inferred: InferredSolcVersion,
): string[] {
  return versions.filter((version) => {
    const parsed = parseVersion(version);
    if (parsed === undefined) {
      return false;
    }
    switch (inferred.type) {
      case "exact":
        return equals(parsed, inferred.version);
      case "lessThan":
        return lowerThan(parsed, inferred.bound);
      case "between":
        return (
          greaterThanOrEqual(parsed, inferred.min) &&
          lowerThanOrEqual(parsed, inferred.max)
        );
    }
  });
}
