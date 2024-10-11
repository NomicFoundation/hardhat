import type { PrefixedHexString } from "./hex.js";

import {
  AmbiguousLibraryNameError,
  InvalidLibraryAddressError,
  MissingLibrariesError,
  OverlappingLibrariesError,
  UnnecessaryLibraryError,
} from "./errors/bytecode.js";
import { isAddress } from "./eth.js";
import { getPrefixedHexString, getUnprefixedHexString } from "./hex.js";

interface Artifact {
  bytecode: string;
  linkReferences: {
    [sourceName: string]: {
      [libraryName: string]: Array<{ start: number; length: number }>;
    };
  };
}

interface LibraryLink {
  sourceName: string;
  libraryName: string;
  libraryFqn: string;
  address: string;
}

interface LibraryAddresses {
  [contractName: string]: PrefixedHexString;
}

/**
 * Resolves the linked bytecode for a given contract artifact by ensuring all
 * required libraries are correctly linked.
 *
 * @param artifact The contract artifact containing the bytecode and link references.
 * @param providedLibraries An object containing library names as keys and their addresses as values.
 * @returns The linked bytecode with all required libraries correctly linked.
 * @throws InvalidLibraryAddressError If any provided library address is invalid.
 * @throws AmbiguousLibraryNameError If any provided library name matches multiple needed libraries.
 * @throws UnnecessaryLibraryError If any provided library name is not needed by the contract.
 * @throws OverlappingLibrariesError If any library is provided more than once.
 * @throws MissingLibrariesError If any needed library address is missing.
 */
export function resolveLinkedBytecode(
  artifact: Artifact,
  providedLibraries: LibraryAddresses,
): PrefixedHexString {
  checkProvidedLibraryAddresses(providedLibraries);

  const neededLibraries: LibraryLink[] = [];
  for (const [sourceName, sourceLibraries] of Object.entries(
    artifact.linkReferences,
  )) {
    for (const libraryName of Object.keys(sourceLibraries)) {
      const libraryFqn = `${sourceName}:${libraryName}`;
      const address =
        providedLibraries[libraryFqn] ?? providedLibraries[libraryName];

      neededLibraries.push({
        sourceName,
        libraryName,
        libraryFqn,
        address,
      });
    }
  }

  checkAmbiguousOrUnnecessaryLinks(providedLibraries, neededLibraries);
  checkOverlappingLibraryNames(providedLibraries, neededLibraries);
  checkMissingLibraryAddresses(neededLibraries);

  return linkBytecode(artifact, neededLibraries);
}

/**
 * Links the bytecode of a contract artifact with the provided library addresses.
 * This function does not perform any validation on the provided libraries.
 *
 * @param artifact The contract artifact containing the bytecode and link references.
 * @param libraries An array of LibraryLink objects representing the libraries to be linked.
 * @returns The linked bytecode with all provided libraries correctly linked.
 */
export function linkBytecode(
  artifact: Artifact,
  libraries: LibraryLink[],
): PrefixedHexString {
  const { bytecode, linkReferences } = artifact;
  let linkedBytecode = bytecode;

  for (const { sourceName, libraryName, address } of libraries) {
    const contractLinkReferences = linkReferences[sourceName]?.[libraryName];
    const unprefixedAddress = getUnprefixedHexString(address);

    for (const { start, length } of contractLinkReferences) {
      linkedBytecode =
        linkedBytecode.substring(0, 2 + start * 2) +
        unprefixedAddress +
        linkedBytecode.substring(2 + (start + length) * 2);
    }
  }

  return getPrefixedHexString(linkedBytecode);
}

/**
 * Check that the provided library addresses are valid Ethereum addresses.
 * If any of them are not, an InvalidLibraryAddressError is thrown.
 */
function checkProvidedLibraryAddresses(providedLibraries: LibraryAddresses) {
  const librariesWithInvalidAddresses = Object.entries(
    providedLibraries,
  ).filter(([, address]) => !isAddress(address));

  if (librariesWithInvalidAddresses.length === 0) {
    return;
  }

  const formattedLibraries = librariesWithInvalidAddresses
    .map(([libraryName, address]) => `\t* "${libraryName}": "${address}"`)
    .join("\n");

  throw new InvalidLibraryAddressError(formattedLibraries);
}

/**
 * Check that the provided libraries can't be resolved to multiple libraries, or
 * that they are not needed by the contract. If any of these conditions are met,
 * an AmbiguousLibraryNameError or an UnnecessaryLibraryError is thrown.
 */
function checkAmbiguousOrUnnecessaryLinks(
  providedLibraries: LibraryAddresses,
  neededLibraries: LibraryLink[],
) {
  const ambiguousLibraries: Array<{
    providedLibraryName: string;
    matchingLibraries: LibraryLink[];
  }> = [];
  const unnecessaryLibraries: string[] = [];

  for (const providedLibraryName of Object.keys(providedLibraries)) {
    const matchingLibraries = neededLibraries.filter(
      ({ libraryName, libraryFqn }) =>
        libraryName === providedLibraryName ||
        libraryFqn === providedLibraryName,
    );

    if (matchingLibraries.length > 1) {
      ambiguousLibraries.push({
        providedLibraryName,
        matchingLibraries,
      });
    } else if (matchingLibraries.length === 0) {
      unnecessaryLibraries.push(providedLibraryName);
    }
  }

  if (ambiguousLibraries.length > 0) {
    const formattedLibraries = ambiguousLibraries
      .map(
        ({ providedLibraryName, matchingLibraries }) =>
          `\t* "${providedLibraryName}":\n${matchingLibraries
            .map(({ libraryFqn }) => `\t\t* "${libraryFqn}"`)
            .join("\n")}`,
      )
      .join("\n");

    throw new AmbiguousLibraryNameError(formattedLibraries);
  }

  if (unnecessaryLibraries.length > 0) {
    const formattedLibraries = unnecessaryLibraries
      .map((libraryName) => `\t* "${libraryName}"`)
      .join("\n");

    throw new UnnecessaryLibraryError(formattedLibraries);
  }
}

/**
 * Check that each library is only provided once, either by its name or its
 * fully qualified name. If a library is provided more than once, an
 * OverlappingLibrariesError is thrown.
 */
function checkOverlappingLibraryNames(
  providedLibraries: LibraryAddresses,
  neededLibraries: LibraryLink[],
) {
  const overlappingLibraries = neededLibraries.filter(
    ({ libraryName, libraryFqn }) =>
      providedLibraries[libraryFqn] !== undefined &&
      providedLibraries[libraryName] !== undefined,
  );

  if (overlappingLibraries.length === 0) {
    return;
  }

  const formattedLibraries = overlappingLibraries
    .map(({ libraryFqn }) => `\t* "${libraryFqn}"`)
    .join("\n");

  throw new OverlappingLibrariesError(formattedLibraries);
}

/**
 * Check if the needed libraries have all their addresses resolved. If an
 * address is missing, it means that the user didn't provide it in the
 * providedLibraries map. In that case, an MissingLibrariesError is thrown.
 */
function checkMissingLibraryAddresses(neededLibraries: LibraryLink[]) {
  const missingLibraries = neededLibraries.filter(
    ({ address }) => address === undefined,
  );

  if (missingLibraries.length === 0) {
    return;
  }

  const formattedLibraries = missingLibraries
    .map(({ libraryFqn }) => `\t* "${libraryFqn}"`)
    .join("\n");

  throw new MissingLibrariesError(formattedLibraries);
}
