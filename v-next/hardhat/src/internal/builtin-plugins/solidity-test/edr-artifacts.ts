import type { ArtifactManager, BuildInfo } from "../../../types/artifacts.js";
import type { BuildInfoAndOutput, Artifact as EdrArtifact } from "@ignored/edr";

import { assertHardhatInvariant } from "@nomicfoundation/hardhat-errors";
import {
  readBinaryFile,
  readJsonFile,
} from "@nomicfoundation/hardhat-utils/fs";

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
): Promise<Array<{ edrAtifact: EdrArtifact; userSourceName: string }>> {
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

      // TODO: Don't read the build info just to get the solc version
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
      source: artifact.inputSourceName ?? artifact.sourceName,
    };

    const contract = {
      abi: JSON.stringify(artifact.abi),
      bytecode: artifact.bytecode,
      linkReferences: artifact.linkReferences,
      deployedBytecode: artifact.deployedBytecode,
      deployedLinkReferences: artifact.deployedLinkReferences,
    };

    // TODO: This is a temporary solution. Ideally EDR would be aware that there
    // are both input and user source names, or we'd have a cheap way to match
    // from an artifact id between the `run` call and the events emitted by the
    // test runner.
    return {
      edrAtifact: {
        id,
        contract,
      },
      userSourceName: artifact.sourceName,
    };
  });
}
