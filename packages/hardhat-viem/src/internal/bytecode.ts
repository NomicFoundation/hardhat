import type * as viemT from "viem";
import type { Artifact } from "hardhat/types/artifacts";

import {
  AmbiguousLibraryNameError,
  MissingLibraryAddressError,
  OverlappingLibraryNamesError,
  UnnecessaryLibraryLinkError,
} from "./errors";

export interface Libraries<Address = string> {
  [libraryName: string]: Address;
}

export interface Link {
  sourceName: string;
  libraryName: string;
  address: string;
}

export async function linkBytecode(
  artifact: Artifact,
  libraries: Link[]
): Promise<viemT.Hex> {
  const { isHex } = await import("viem");
  let bytecode = artifact.bytecode;

  // TODO: measure performance impact
  for (const { sourceName, libraryName, address } of libraries) {
    const linkReferences = artifact.linkReferences[sourceName][libraryName];
    for (const { start, length } of linkReferences) {
      bytecode =
        bytecode.substring(0, 2 + start * 2) +
        address.substring(2) +
        bytecode.substring(2 + (start + length) * 2);
    }
  }

  return isHex(bytecode) ? bytecode : `0x${bytecode}`;
}

async function throwOnAmbiguousLibraryNameOrUnnecessaryLink(
  contractName: string,
  libraries: Libraries<viemT.Address>,
  neededLibraries: Link[]
) {
  for (const linkedLibraryName of Object.keys(libraries)) {
    const matchingLibraries = neededLibraries.filter(
      ({ sourceName, libraryName }) =>
        libraryName === linkedLibraryName ||
        `${sourceName}:${libraryName}` === linkedLibraryName
    );

    if (matchingLibraries.length > 1) {
      throw new AmbiguousLibraryNameError(
        contractName,
        linkedLibraryName,
        matchingLibraries.map(
          ({ sourceName, libraryName }) => `${sourceName}:${libraryName}`
        )
      );
    } else if (matchingLibraries.length === 0) {
      throw new UnnecessaryLibraryLinkError(contractName, linkedLibraryName);
    }
  }
}

async function throwOnMissingLibrariesAddress(
  contractName: string,
  libraries: Libraries<viemT.Address>,
  neededLibraries: Link[]
) {
  const missingLibraries = [];
  for (const { sourceName, libraryName } of neededLibraries) {
    const address =
      libraries[`${sourceName}:${libraryName}`] ?? libraries[libraryName];

    if (address === undefined) {
      missingLibraries.push({ sourceName, libraryName });
    }
  }

  if (missingLibraries.length > 0) {
    throw new MissingLibraryAddressError(contractName, missingLibraries);
  }
}

async function throwOnOverlappingLibraryNames(
  contractName: string,
  libraries: Libraries<viemT.Address>,
  neededLibraries: Link[]
) {
  for (const { sourceName, libraryName } of neededLibraries) {
    if (
      libraries[`${sourceName}:${libraryName}`] !== undefined &&
      libraries[libraryName] !== undefined
    ) {
      throw new OverlappingLibraryNamesError(sourceName, libraryName);
    }
  }
}

export async function resolveBytecodeWithLinkedLibraries(
  artifact: Artifact,
  libraries: Libraries<viemT.Address>
): Promise<viemT.Hex> {
  const { linkReferences } = artifact;

  const neededLibraries: Link[] = [];
  for (const [sourceName, sourceLibraries] of Object.entries(linkReferences)) {
    for (const libraryName of Object.keys(sourceLibraries)) {
      neededLibraries.push({
        sourceName,
        libraryName,
        address:
          libraries[`${sourceName}:${libraryName}`] ?? libraries[libraryName],
      });
    }
  }

  await throwOnAmbiguousLibraryNameOrUnnecessaryLink(
    artifact.contractName,
    libraries,
    neededLibraries
  );
  await throwOnOverlappingLibraryNames(
    artifact.contractName,
    libraries,
    neededLibraries
  );
  await throwOnMissingLibrariesAddress(
    artifact.contractName,
    libraries,
    neededLibraries
  );

  return linkBytecode(artifact, neededLibraries);
}
