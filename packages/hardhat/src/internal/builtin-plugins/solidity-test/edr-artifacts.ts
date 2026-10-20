import type { Artifact, ArtifactManager } from "../../../types/artifacts.js";
import type { SolidityBuildInfoOutput } from "../../../types/solidity/solidity-artifacts.js";
import type {
  BuildInfoAndOutput as EdrBuildInfoAndOutput,
  Artifact as EdrArtifact,
} from "@nomicfoundation/edr";

import {
  assertHardhatInvariant,
  HardhatError,
} from "@nomicfoundation/hardhat-errors";
import { parseJsonBytes } from "@nomicfoundation/hardhat-utils/bytes";
import { ensureError } from "@nomicfoundation/hardhat-utils/error";
import { readBinaryFile } from "@nomicfoundation/hardhat-utils/fs";

import { getContractArtifact } from "../solidity/build-system/artifacts.js";
import { HARDHAT_PROJECT_INPUT_SOURCE_NAME_ROOT } from "../solidity/constants.js";
import { toUserSourceName } from "../solidity/source-names.js";

export interface BuildInfoAndOutput extends EdrBuildInfoAndOutput {
  buildInfoId: string;
}

export interface EdrArtifactWithMetadata {
  edrArtifact: EdrArtifact;
  userSourceName: string;
  buildInfoId: string;
}

export const BUILD_INFO_FORMAT: RegExp =
  /^solc-(?<major>\d+)_(?<minor>\d+)_(?<patch>\d+)(?:-(?<compilerType>[a-zA-Z][a-zA-Z0-9-]*))?-[0-9a-fA-F]*$/;

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

  return await Promise.all(
    Array.from(buildInfoIds).map(async (buildInfoId) => {
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

  const artifacts = await Promise.all(
    Array.from(fullyQualifiedNames).map(async (fullyQualifiedName) => {
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
      const solcShortVersion = getSolcVersionFromBuildInfoId(buildInfoId);

      if (solcShortVersion === undefined) {
        return undefined;
      }

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

    return toEdrArtifactWithMetadata(
      artifact,
      artifact.buildInfoId,
      solcVersion,
    );
  });
}

/**
 * This function returns the project contracts compiled in the given build
 * infos that have no artifact from the same build info among
 * `edrArtifactsWithMetadata`.
 *
 * A build only emits artifacts for its root files, so the project contracts
 * that a root imports have no artifact unless they are roots of another build.
 * EDR identifies contracts (e.g. in call traces and invariant targets) only
 * from the artifacts it gets, so a test run needs these contracts too.
 *
 * Contracts from npm packages are left out: they only get artifacts when
 * listed in `npmFilesToBuild`, and adding them could make a name ambiguous
 * for EDR (e.g. a project `Ownable` and OpenZeppelin's `Ownable`).
 *
 * @param buildInfosAndOutputs The build infos whose contracts to return.
 * @param edrArtifactsWithMetadata The artifacts read from the artifacts
 * directories.
 * @returns The artifacts in the format expected by the EDR.
 */
export async function buildEdrArtifactsWithMetadataFromBuildInfos(
  buildInfosAndOutputs: BuildInfoAndOutput[],
  edrArtifactsWithMetadata: EdrArtifactWithMetadata[],
): Promise<EdrArtifactWithMetadata[]> {
  const contractsWithArtifact = new Set(
    edrArtifactsWithMetadata.map(({ buildInfoId, edrArtifact }) =>
      getContractKey(buildInfoId, edrArtifact.id.source, edrArtifact.id.name),
    ),
  );

  const result: EdrArtifactWithMetadata[] = [];

  for (const { buildInfoId, output } of buildInfosAndOutputs) {
    const solcVersion = getSolcVersionFromBuildInfoId(buildInfoId);

    // As in `buildEdrArtifactsWithMetadata`, we ignore build infos that
    // weren't generated by Hardhat.
    if (solcVersion === undefined) {
      continue;
    }

    let parsedOutput: SolidityBuildInfoOutput;
    try {
      parsedOutput = await parseJsonBytes<SolidityBuildInfoOutput>(output);
    } catch (error) {
      ensureError(error);
      throw new HardhatError(
        HardhatError.ERRORS.CORE.SOLIDITY.BUILD_INFO_OUTPUT_PARSE_ERROR,
        { buildInfoId },
        error,
      );
    }

    for (const [inputSourceName, contracts] of Object.entries(
      parsedOutput.output.contracts ?? {},
    )) {
      if (
        !inputSourceName.startsWith(
          `${HARDHAT_PROJECT_INPUT_SOURCE_NAME_ROOT}/`,
        )
      ) {
        continue;
      }

      for (const [contractName, contract] of Object.entries(contracts)) {
        if (
          contractsWithArtifact.has(
            getContractKey(buildInfoId, inputSourceName, contractName),
          )
        ) {
          continue;
        }

        const artifact = getContractArtifact(
          buildInfoId,
          toUserSourceName(inputSourceName),
          inputSourceName,
          contractName,
          contract,
        );

        result.push(
          toEdrArtifactWithMetadata(artifact, buildInfoId, solcVersion),
        );
      }
    }
  }

  return result;
}

/**
 * Merges the contracts compiled with the selected tests into the artifacts
 * given to EDR. A compiled contract replaces any artifact with the same id, as
 * that artifact may be stale, except for the artifacts from the selected tests'
 * own build infos: those were just emitted, and a compiled contract with the
 * same id comes from another build info, maybe with other compiler settings.
 *
 * @param edrArtifactsWithMetadata The artifacts read from the artifacts
 * directories.
 * @param compiledContracts The contracts returned by
 * `buildEdrArtifactsWithMetadataFromBuildInfos`.
 * @param selectedBuildInfoIds The build info ids of the selected tests.
 * @returns The artifacts to give EDR, with one entry per id.
 */
export function mergeCompiledContracts(
  edrArtifactsWithMetadata: EdrArtifactWithMetadata[],
  compiledContracts: EdrArtifactWithMetadata[],
  selectedBuildInfoIds: ReadonlySet<string>,
): EdrArtifactWithMetadata[] {
  const keptIds = new Set(
    edrArtifactsWithMetadata
      .filter(({ buildInfoId }) => selectedBuildInfoIds.has(buildInfoId))
      .map(getArtifactIdKey),
  );

  const contractsToAdd = new Map<string, EdrArtifactWithMetadata>();
  for (const contract of compiledContracts) {
    const key = getArtifactIdKey(contract);

    if (!keptIds.has(key) && !contractsToAdd.has(key)) {
      contractsToAdd.set(key, contract);
    }
  }

  return [
    ...edrArtifactsWithMetadata.filter(
      (artifact) => !contractsToAdd.has(getArtifactIdKey(artifact)),
    ),
    ...contractsToAdd.values(),
  ];
}

function getArtifactIdKey({ edrArtifact }: EdrArtifactWithMetadata): string {
  return JSON.stringify([
    edrArtifact.id.name,
    edrArtifact.id.source,
    edrArtifact.id.solcVersion,
  ]);
}

function getSolcVersionFromBuildInfoId(
  buildInfoId: string,
): string | undefined {
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

  return `${match.groups.major}.${match.groups.minor}.${match.groups.patch}`;
}

function getContractKey(
  buildInfoId: string,
  inputSourceName: string,
  contractName: string,
): string {
  return JSON.stringify([buildInfoId, inputSourceName, contractName]);
}

function toEdrArtifactWithMetadata(
  artifact: Artifact,
  buildInfoId: string,
  solcVersion: string,
): EdrArtifactWithMetadata {
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
    buildInfoId,
  };
}

function displayArtifactForError(artifact: Artifact): string {
  return `'${artifact.contractName}' in '${artifact.sourceName}'`;
}
