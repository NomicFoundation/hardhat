import type { ArtifactManager } from "../../../types/artifacts.js";
import type {
  BuildInfoAndOutput,
  Artifact as EdrArtifact,
} from "@nomicfoundation/edr";

import { assertHardhatInvariant } from "@nomicfoundation/hardhat-errors";
import { readBinaryFile } from "@nomicfoundation/hardhat-utils/fs";

const BUILD_INFO_FORMAT =
  /^solc-(?<major>\d+)_(?<minor>\d+)_(?<patch>\d+)-[0-9a-fA-F]*$/;

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
export async function getEdrArtifacts(
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

  const solcVersionsArray: Array<[string, string]> = buildInfoIds
    .map((buildInfoId) => {
      assertHardhatInvariant(
        buildInfoId !== undefined,
        "buildInfoId should not be undefined",
      );

      const match = BUILD_INFO_FORMAT.exec(buildInfoId);

      // If the build info doesn't match this pattern it was probably generated
      // by something other than Hardhat and/or using a different compiler, so
      // we just ignore it.
      if (match === null) {
        return undefined;
      }

      assertHardhatInvariant(
        match.groups !== undefined,
        "The match must have groups",
      );

      const solcShortVersion = `${match.groups.major}.${match.groups.minor}.${match.groups.patch}`;

      const result: [string, string] = [buildInfoId, solcShortVersion];

      return result;
    })
    .filter((solcVersionBuildInfoId) => solcVersionBuildInfoId !== undefined);

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
