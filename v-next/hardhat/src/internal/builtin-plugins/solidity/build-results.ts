import type {
  Artifact as HardhatArtifact,
  ArtifactManager,
} from "../../../types/artifacts.js";
import type {
  CompilationJobCreationError,
  FailedFileBuildResult,
  FileBuildResult,
  SolidityBuildInfo,
} from "../../../types/solidity.js";
import type { BuildInfoAndOutput, Artifact as EdrArtifact } from "@ignored/edr";

import {
  assertHardhatInvariant,
  HardhatError,
} from "@ignored/hardhat-vnext-errors";
import { readBinaryFile, readJsonFile } from "@ignored/hardhat-vnext-utils/fs";

import { FileBuildResultType } from "../../../types/solidity.js";

type SolidityBuildResults =
  | Map<string, FileBuildResult>
  | CompilationJobCreationError;
type SuccessfulSolidityBuildResults = Map<
  string,
  Exclude<FileBuildResult, FailedFileBuildResult>
>;

/**
 * This function asserts that the given Solidity build results are successful.
 * It throws a HardhatError if the build results indicate that the compilation
 * job failed.
 */
export function throwIfSolidityBuildFailed(
  results: SolidityBuildResults,
): asserts results is SuccessfulSolidityBuildResults {
  if ("reason" in results) {
    throw new HardhatError(
      HardhatError.ERRORS.SOLIDITY.COMPILATION_JOB_CREATION_ERROR,
      {
        reason: results.formattedReason,
        rootFilePath: results.rootFilePath,
        buildProfile: results.buildProfile,
      },
    );
  }

  const sucessful = [...results.values()].every(
    ({ type }) =>
      type === FileBuildResultType.CACHE_HIT ||
      type === FileBuildResultType.BUILD_SUCCESS,
  );

  if (!sucessful) {
    throw new HardhatError(HardhatError.ERRORS.SOLIDITY.BUILD_FAILED);
  }
}

/**
 * This function returns the build infos and outputs associated with the given
 * Solidity build results.
 *
 * @param results The successful Solidity build results.
 * @param artifactManager The artifact manager.
 * @returns The build infos in the Hardhat v3 format as expected by the EDR.
 */
export async function getBuildInfos(
  results: SuccessfulSolidityBuildResults,
  artifactManager: ArtifactManager,
): Promise<BuildInfoAndOutput[]> {
  const buildIds = Array.from(new Set(results.values())).map(
    ({ buildId }) => buildId,
  );

  return Promise.all(
    buildIds.map(async (buildId) => {
      const buildInfoPath = await artifactManager.getBuildInfoPath(buildId);
      const buildInfoOutputPath =
        await artifactManager.getBuildInfoOutputPath(buildId);

      assertHardhatInvariant(
        buildInfoPath !== undefined,
        "buildInfoPath should not be undefined",
      );
      assertHardhatInvariant(
        buildInfoOutputPath !== undefined,
        "buildInfoOutputPath should not be undefined",
      );

      const buildInfo = await readBinaryFile(buildInfoPath);
      const output = await readBinaryFile(buildInfoOutputPath);

      return {
        buildInfo,
        output,
      };
    }),
  );
}

/**
 * This function returns the artifacts generated during the compilation associated
 * with the given Solidity build results. It relies on the fact that each successful
 * build result has a corresponding artifact generated property.
 *
 * @param results The successful Solidity build results.
 * @param artifactManager The artifact manager.
 * @returns The artifacts in the format expected by the EDR.
 */
export async function getArtifacts(
  results: SuccessfulSolidityBuildResults,
  buildInfos: BuildInfoAndOutput[],
): Promise<EdrArtifact[]> {
  const solcVersions = Object.fromEntries(
    buildInfos.map(({ buildInfo }) => {
      const solidityBuildInfo: SolidityBuildInfo = JSON.parse(
        new TextDecoder("utf-8").decode(buildInfo),
      );

      return [solidityBuildInfo.id, solidityBuildInfo.solcVersion];
    }),
  );

  const contractArtifacts = Array.from(results.entries())
    .map(([source, result]) => {
      return result.contractArtifactsGenerated.map((artifactPath) => ({
        source,
        buildId: result.buildId,
        artifactPath,
      }));
    })
    .flat();

  return Promise.all(
    contractArtifacts.map(async ({ source, buildId, artifactPath }) => {
      const artifact: HardhatArtifact = await readJsonFile(artifactPath);

      const solcVersion = solcVersions[buildId];

      assertHardhatInvariant(
        solcVersion !== undefined,
        "solcVersion should not be undefined",
      );

      const id = {
        name: artifact.contractName,
        solcVersion,
        source,
      };

      const contract = {
        abi: JSON.stringify(artifact.abi),
        bytecode: artifact.bytecode,
        deployedBytecode: artifact.deployedBytecode,
      };

      return {
        id,
        contract,
      };
    }),
  );
}
