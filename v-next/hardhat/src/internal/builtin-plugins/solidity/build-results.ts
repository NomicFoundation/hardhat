import type { ArtifactManager, BuildInfo } from "../../../types/artifacts.js";
import type {
  CompilationJobCreationError,
  FailedFileBuildResult,
  FileBuildResult,
} from "../../../types/solidity.js";
import type { BuildInfoAndOutput, Artifact as EdrArtifact } from "@ignored/edr";

import {
  assertHardhatInvariant,
  HardhatError,
} from "@nomicfoundation/hardhat-errors";
import {
  readBinaryFile,
  readJsonFile,
} from "@nomicfoundation/hardhat-utils/fs";

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
 * This function returns all the build infos and associated outputs.
 *
 * @param artifactManager The artifact manager.
 * @returns The build infos in the Hardhat v3 format as expected by the EDR.
 */
export async function getBuildInfos(
  artifactManager: ArtifactManager,
): Promise<BuildInfoAndOutput[]> {
  const buildIds = await artifactManager.getAllBuildInfoIds();

  return Promise.all(
    Array.from(buildIds).map(async (buildId) => {
      const buildInfoPath = await artifactManager.getBuildInfoPath(buildId);
      const buildInfoOutputPath =
        await artifactManager.getBuildInfoOutputPath(buildId);

      // This is only safe because of how we currently interact with getBuildInfos
      // i.e. we call it immediately after a build which should ensure both
      // the build info and build info output exist. If the usage pattern of this
      // function changes, these invariants might not hold anymore and should be
      // transformed into other errors instead.
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
 * This function returns the artifacts generated during the compilation.
 *
 * @param artifactManager The artifact manager.
 * @returns The artifacts in the format expected by the EDR.
 */
export async function getArtifacts(
  artifactManager: ArtifactManager,
): Promise<EdrArtifact[]> {
  const fullyQualifiedNames = await artifactManager.getAllFullyQualifiedNames();

  const artifacts = await Promise.all(
    Array.from(fullyQualifiedNames).map(async (fullyQualifiedName) => {
      return artifactManager.readArtifact(fullyQualifiedName);
    }),
  );

  const buildInfoIds = Array.from(
    new Set(artifacts.map((artifact) => artifact.buildInfoId)),
  );

  const solcVersionsArray: Array<[string, string]> = await Promise.all(
    buildInfoIds.map(async (buildInfoId) => {
      assertHardhatInvariant(
        buildInfoId !== undefined,
        "artifactBuildInfoId should not be undefined",
      );

      const buildInfoPath = await artifactManager.getBuildInfoPath(buildInfoId);

      assertHardhatInvariant(
        buildInfoPath !== undefined,
        "buildInfoPath should not be undefined",
      );

      const buildInfo: BuildInfo = await readJsonFile(buildInfoPath);

      return [buildInfoId, buildInfo.solcVersion];
    }),
  );
  const solcVersions = new Map(solcVersionsArray);

  return artifacts.map((artifact) => {
    assertHardhatInvariant(
      artifact.buildInfoId !== undefined,
      "solcVersion should not be undefined",
    );

    const solcVersion = solcVersions.get(artifact.buildInfoId);

    assertHardhatInvariant(
      solcVersion !== undefined,
      "solcVersion should not be undefined",
    );

    const id = {
      name: artifact.contractName,
      solcVersion,
      source: artifact.sourceName,
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
  });
}
