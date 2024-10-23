import type { PrefixedHexString } from "./hex.js";
import type {
  Artifact,
  LibraryAddresses,
  LibraryLink,
} from "./internal/bytecode.js";

import { getPrefixedHexString, getUnprefixedHexString } from "./hex.js";
import {
  checkAmbiguousOrUnnecessaryLinks,
  checkMissingLibraryAddresses,
  checkOverlappingLibraryNames,
  checkProvidedLibraryAddresses,
} from "./internal/bytecode.js";

/**
 * Resolves the linked bytecode for a given contract artifact by substituting
 * the required library placeholders within the bytecode with the provided
 * library addresses.
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
    const contractLinkReferences =
      linkReferences[sourceName]?.[libraryName] ?? [];
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
