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
interface ArtifactsAndBuildInfos {
  artifacts: EdrArtifact[];
  buildInfos: BuildInfoAndOutput[];
}

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
 * This function returns the artifacts and build infos generated during the
 * compilation associated with the given Solidity build results. It relies on
 * the fact that each successful build result has a corresponding artifact
 * generated property.
 */
export async function getArtifactsAndBuildInfos(
  results: SuccessfulSolidityBuildResults,
  artifactManager: ArtifactManager,
): Promise<ArtifactsAndBuildInfos> {
  const artifacts: EdrArtifact[] = [];
  const buildInfos: BuildInfoAndOutput[] = [];

  const solcVersions: Map<string, string> = new Map();

  for (const [source, result] of results.entries()) {
    for (const artifactPath of result.contractArtifactsGenerated) {
      const artifact: HardhatArtifact = await readJsonFile(artifactPath);

      let solcVersion = solcVersions.get(result.buildId);
      if (solcVersion === undefined) {
        const buildInfoPath = await artifactManager.getBuildInfoPath(
          result.buildId,
        );
        const buildInfoOutputPath =
          await artifactManager.getBuildInfoOutputPath(result.buildId);

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

        const solidityBuildInfo: SolidityBuildInfo = JSON.parse(
          new TextDecoder("utf-8").decode(buildInfo),
        );

        solcVersion = solidityBuildInfo.solcVersion;

        buildInfos.push({
          buildInfo,
          output,
        });
      }

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

      artifacts.push({
        id,
        contract,
      });
    }
  }

  return {
    artifacts,
    buildInfos,
  };
}
