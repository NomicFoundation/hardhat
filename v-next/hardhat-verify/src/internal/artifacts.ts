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

// TODO: reading build info from disk on each call is inefficient.
// We should consider caching the results in memory.
// TODO2: getBuildInfoId and readJsonFile can throw errors, we should
// wrap them in a try-catch block and return undefined if an error occurs
// while also logging the error.
// TODO3: the information contained in the output can be read from the
// artifact:
// artifact field         | output field
// abi                    | contracts.[sourceName][contractName].abi
// linkReferences         | contracts.[sourceName][contractName].evm.bytecode.linkReferences
// deployedLinkReferences | contracts.[sourceName][contractName].evm.deployedBytecode.linkReferences
// deployedBytecode       | contracts.[sourceName][contractName].evm.deployedBytecode.object
// immutableReferences    | contracts.[sourceName][contractName].evm.deployedBytecode.immutableReferences
// TODO4: consider returning only the fields needed from the build info: solcVersion, solcLongVersion, input
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
    // TODO: maybe we should throw an error here indicating that the
    // contract wasn't compiled with Hardhat 3's build system
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
  root: string,
  sourceName: string,
  isNpmModule: boolean,
  buildProfileName: string,
): Promise<CompilerInput> {
  const rootFilePath = isNpmModule
    ? `npm:${sourceName}`
    : path.join(root, sourceName);

  const getCompilationJobsResult = await solidity.getCompilationJobs(
    [rootFilePath],
    {
      buildProfile: buildProfileName,
      quiet: true,
      force: true,
    },
  );

  assertHardhatInvariant(
    !("reason" in getCompilationJobsResult),
    "getCompilationJobs should not error",
  );

  const compilationJob = getCompilationJobsResult.compilationJobsPerFile;

  // TODO: should this be an error instead?
  assertHardhatInvariant(
    compilationJob instanceof Map && compilationJob.size === 1,
    "The compilation job for the contract source was not found.",
  );

  const compilerInput = await compilationJob.get(rootFilePath)?.getSolcInput();

  // TODO: should this be an error instead?
  assertHardhatInvariant(
    compilerInput !== undefined,
    "The compiler input for the contract source was not found.",
  );

  return compilerInput;
}
