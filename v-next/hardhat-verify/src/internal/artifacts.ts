import type { ArtifactManager, BuildInfo } from "hardhat/types/artifacts";
import type {
  CompilerInput,
  SolidityBuildInfoOutput,
  SolidityBuildSystem,
} from "hardhat/types/solidity";

import path from "node:path";

import { assertHardhatInvariant } from "@nomicfoundation/hardhat-errors";
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

// TODO: consider moving this to the solidity build system as a helper function
export async function getCompilerInput(
  solidity: SolidityBuildSystem,
  rootFilePath: string,
  sourceName: string,
  buildProfile: string,
): Promise<CompilerInput> {
  const compilationJob = await solidity.getCompilationJobs(
    [path.join(rootFilePath, sourceName)],
    {
      buildProfile,
      quiet: true,
    },
  );

  // TODO: should this be an error instead?
  assertHardhatInvariant(
    compilationJob instanceof Map && compilationJob.size === 1,
    "The compilation job for the contract source was not found.",
  );

  const compilerInput = await compilationJob.get(sourceName)?.getSolcInput();

  // TODO: should this be an error instead?
  assertHardhatInvariant(
    compilerInput !== undefined,
    "The compiler input for the contract source was not found.",
  );

  return compilerInput;
}
