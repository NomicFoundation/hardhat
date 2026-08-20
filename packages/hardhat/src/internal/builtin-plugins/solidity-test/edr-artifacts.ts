import type { Artifact, ArtifactManager } from "../../../types/artifacts.js";
import type {
  BuildInfoAndOutput as EdrBuildInfoAndOutput,
  Artifact as EdrArtifact,
} from "@nomicfoundation/edr";

import { assertHardhatInvariant } from "@nomicfoundation/hardhat-errors";
import { readBinaryFile } from "@nomicfoundation/hardhat-utils/fs";

export interface BuildInfoAndOutput extends EdrBuildInfoAndOutput {
  buildInfoId: string;
}

export interface EdrArtifactWithMetadata {
  edrArtifact: EdrArtifact;
  userSourceName: string;
  buildInfoId: string;
}

export const BUILD_INFO_FORMAT: RegExp =
  /^solc-(?<major>\d+)_(?<minor>\d+)_(?<patch>\d+)(?:-(?<compilerType>[a-zA-Z][a-zA-Z0-9]*))?-[0-9a-fA-F]*$/;

/**
 * This function returns all the build infos and associated outputs.
 *
 * @param artifactManager The artifact manager.
 * @returns The build infos in the Hardhat v3 format as expected by the EDR.
 */
export async function getBuildInfosAndOutputs(
  artifactManager: ArtifactManager,
): Promise<BuildInfoAndOutput[]> {
  const buildInfoIds = await artifactManager.getAllBuildInfoIds();

  return await readBuildInfosAndOutputs(
    artifactManager,
    Array.from(buildInfoIds),
  );
}

/**
 * Like `getBuildInfosAndOutputs`, but reads only the build infos with the
 * provided ids. Ids whose build info or output file doesn't exist are
 * skipped; consumers detect missing build infos by their absence from the
 * result.
 *
 * @param artifactManager The artifact manager.
 * @param buildInfoIds The ids of the build infos to read.
 * @returns The build infos in the Hardhat v3 format as expected by the EDR.
 */
export async function getBuildInfosAndOutputsByIds(
  artifactManager: ArtifactManager,
  buildInfoIds: Iterable<string>,
): Promise<BuildInfoAndOutput[]> {
  const results = await Promise.all(
    Array.from(buildInfoIds).map(async (buildInfoId) => {
      const buildInfoPath = await artifactManager.getBuildInfoPath(buildInfoId);
      const buildInfoOutputPath =
        await artifactManager.getBuildInfoOutputPath(buildInfoId);

      if (buildInfoPath === undefined || buildInfoOutputPath === undefined) {
        return undefined;
      }

      const buildInfo = await readBinaryFile(buildInfoPath);
      const output = await readBinaryFile(buildInfoOutputPath);

      return {
        buildInfoId,
        buildInfo,
        output,
      };
    }),
  );

  return results.filter((result) => result !== undefined);
}

async function readBuildInfosAndOutputs(
  artifactManager: ArtifactManager,
  buildInfoIds: string[],
): Promise<BuildInfoAndOutput[]> {
  return await Promise.all(
    buildInfoIds.map(async (buildInfoId) => {
      const buildInfoPath = await artifactManager.getBuildInfoPath(buildInfoId);
      const buildInfoOutputPath =
        await artifactManager.getBuildInfoOutputPath(buildInfoId);

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
        buildInfoId,
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
export async function buildEdrArtifactsWithMetadata(
  artifactManager: ArtifactManager,
): Promise<EdrArtifactWithMetadata[]> {
  const fullyQualifiedNames = await artifactManager.getAllFullyQualifiedNames();

  return await readEdrArtifactsWithMetadata(
    artifactManager,
    Array.from(fullyQualifiedNames),
  );
}

/**
 * Like `buildEdrArtifactsWithMetadata`, but reads only the artifacts whose
 * user source name is selected by the provided predicate. The source name is
 * derived from the fully qualified name, so unselected artifacts are never
 * read from disk.
 *
 * @param artifactManager The artifact manager.
 * @param isSourceNameSelected Predicate over user source names.
 * @returns The selected artifacts in the format expected by the EDR.
 */
export async function buildEdrArtifactsWithMetadataForSources(
  artifactManager: ArtifactManager,
  isSourceNameSelected: (userSourceName: string) => boolean,
): Promise<EdrArtifactWithMetadata[]> {
  const fullyQualifiedNames = await artifactManager.getAllFullyQualifiedNames();

  const selectedFullyQualifiedNames = Array.from(fullyQualifiedNames).filter(
    (fullyQualifiedName) => {
      // Fully qualified names are `<user source name>:<contract name>`, and
      // the contract name can't contain `:`.
      const sourceName = fullyQualifiedName.substring(
        0,
        fullyQualifiedName.lastIndexOf(":"),
      );

      return isSourceNameSelected(sourceName);
    },
  );

  return await readEdrArtifactsWithMetadata(
    artifactManager,
    selectedFullyQualifiedNames,
  );
}

async function readEdrArtifactsWithMetadata(
  artifactManager: ArtifactManager,
  fullyQualifiedNames: string[],
): Promise<EdrArtifactWithMetadata[]> {
  const artifacts = await Promise.all(
    fullyQualifiedNames.map(async (fullyQualifiedName) => {
      return await artifactManager.readArtifact(fullyQualifiedName);
    }),
  );

  const buildInfoIds: string[] = Array.from(
    new Set(
      artifacts.map((artifact) => {
        assertHardhatInvariant(
          artifact.buildInfoId !== undefined,
          `buildInfoId should not be undefined for artifact: ${displayArtifactForError(artifact)}`,
        );

        return artifact.buildInfoId;
      }),
    ),
  );

  const solcVersionsArray: Array<[string, string]> = buildInfoIds
    .map((buildInfoId) => {
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
      `buildInfoId should not be undefined for artifact: ${displayArtifactForError(artifact)}`,
    );

    const solcVersion = solcVersions.get(artifact.buildInfoId);

    assertHardhatInvariant(
      solcVersion !== undefined,
      `solcVersion should not be undefined for artifact: ${displayArtifactForError(artifact)}`,
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
      edrArtifact: {
        id,
        contract,
      },
      userSourceName: artifact.sourceName,
      buildInfoId: artifact.buildInfoId,
    };
  });
}

function displayArtifactForError(artifact: Artifact): string {
  return `'${artifact.contractName}' in '${artifact.sourceName}'`;
}
