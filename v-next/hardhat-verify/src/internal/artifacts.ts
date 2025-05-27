import type { ArtifactManager, BuildInfo } from "hardhat/types/artifacts";
import type { SolidityBuildInfoOutput } from "hardhat/types/solidity";

import { readJsonFile } from "@nomicfoundation/hardhat-utils/fs";

export interface BuildInfoAndOutput {
  buildInfo: BuildInfo;
  buildInfoOutput: SolidityBuildInfoOutput;
}

// TODO: we should implement this function in the artifact
// manager. Reading build info from disk on each call is inefficient.
// Having the logic in the artifact manager to enable caching and avoid
// duplication.
/**
 * Retrieves the saved build information and output for a given contract.
 *
 * @param artifacts The artifact manager instance to use for retrieving build info.
 * @param contract The fully qualified contract name (e.g., "contracts/Token.sol:Token").
 * @returns The `BuildInfo` object if it exists on disk, or `undefined` if no
 * build info is found.
 */
export async function getBuildInfoAndOutput(
  artifacts: ArtifactManager,
  contract: string,
): Promise<BuildInfoAndOutput | undefined> {
  const buildInfoId = await artifacts.getBuildInfoId(contract);
  if (buildInfoId === undefined) {
    return undefined;
  }

  const buildInfoPath = await artifacts.getBuildInfoPath(buildInfoId);
  if (buildInfoPath === undefined) {
    return undefined;
  }

  const buildInfoOutputPath =
    await artifacts.getBuildInfoOutputPath(buildInfoId);
  if (buildInfoOutputPath === undefined) {
    return undefined;
  }

  const buildInfo: BuildInfo = await readJsonFile(buildInfoPath);
  const buildInfoOutput: SolidityBuildInfoOutput =
    await readJsonFile(buildInfoOutputPath);

  return {
    buildInfo,
    buildInfoOutput,
  };
}
