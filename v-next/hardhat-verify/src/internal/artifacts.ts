import type { ArtifactManager, BuildInfo } from "hardhat/types/artifacts";
import type {
  CompilerInput,
  CompilerOutputContract,
} from "hardhat/types/solidity";

import { readJsonFile } from "@nomicfoundation/hardhat-utils/fs";

export type ContractWithLibraries = ContractInformation & LibraryInformation;

export interface ContractInformation {
  compilerInput: CompilerInput;
  solcLongVersion: string;
  sourceName: string;
  contractName: string;
  contractOutput: CompilerOutputContract;
  deployedBytecode: string;
}

interface LibraryInformation {
  libraries: SourceLibraries;
  undetectableLibraries: string[];
}

export type SourceLibraries = Record<
  /* source file name */ string,
  LibraryAddresses
>;

export type LibraryAddresses = Record<
  /* library name */ string,
  /* address */ string
>;

// TODO: we should implement `getBuildInfo` in v3’s artifact
// manager. Reading build info from disk on each call is inefficient.
// Having the logic in the artifact manager to enable caching and avoid
// duplication.
/**
 * Retrieves the saved build information for a given contract.
 *
 * @param artifacts The artifact manager instance to use for retrieving build info.
 * @param contract The fully qualified contract name (e.g., "contracts/Token.sol:Token").
 * @returns The `BuildInfo` object if it exists on disk, or `undefined` if no
 * build info is found.
 */
export async function getBuildInfo(
  artifacts: ArtifactManager,
  contract: string,
): Promise<BuildInfo | undefined> {
  const buildInfoId = await artifacts.getBuildInfoId(contract);
  if (buildInfoId === undefined) {
    return undefined;
  }

  const buildInfoPath = await artifacts.getBuildInfoPath(buildInfoId);
  if (buildInfoPath === undefined) {
    return undefined;
  }

  const buildInfo: BuildInfo = await readJsonFile(buildInfoPath);

  return buildInfo;
}
