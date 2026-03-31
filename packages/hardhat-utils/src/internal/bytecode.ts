import type { PrefixedHexString } from "../hex.js";

import {
  AmbiguousLibraryNameError,
  InvalidLibraryAddressError,
  MissingLibrariesError,
  OverlappingLibrariesError,
  UnnecessaryLibraryError,
} from "../errors/bytecode.js";
import { isAddress } from "../eth.js";

export interface Artifact {
  bytecode: string;
  linkReferences: {
    [inputSourceName: string]: {
      [libraryName: string]: Array<{ start: number; length: number }>;
    };
  };
}

export interface LibraryLink {
  sourceName: string;
  libraryName: string;
  libraryFqn: string;
  address: string;
}

export interface LibraryAddresses {
  [contractName: string]: PrefixedHexString;
}

/**
 * Check that the provided library addresses are valid Ethereum addresses.
 * If any of them are not, an InvalidLibraryAddressError is thrown.
 */
export function checkProvidedLibraryAddresses(
  providedLibraries: LibraryAddresses,
): void {
  const librariesWithInvalidAddresses: LibraryAddresses = {};
  for (const [name, address] of Object.entries(providedLibraries)) {
    if (!isAddress(address)) {
      librariesWithInvalidAddresses[name] = address;
    }
  }

  if (Object.keys(librariesWithInvalidAddresses).length === 0) {
    return;
  }

  throw new InvalidLibraryAddressError(librariesWithInvalidAddresses);
}

/**
 * Check that the provided libraries can't be resolved to multiple libraries, or
 * that they are not needed by the contract. If any of these conditions are met,
 * an AmbiguousLibraryNameError or an UnnecessaryLibraryError is thrown.
 */
export function checkAmbiguousOrUnnecessaryLinks(
  providedLibraries: LibraryAddresses,
  neededLibraries: LibraryLink[],
): void {
  const ambiguousLibraries: Record<string, LibraryLink[]> = {};
  const unnecessaryLibraries: string[] = [];

  for (const providedLibraryName of Object.keys(providedLibraries)) {
    const matchingLibraries = neededLibraries.filter(
      ({ libraryName, libraryFqn }) =>
        libraryName === providedLibraryName ||
        libraryFqn === providedLibraryName,
    );

    if (matchingLibraries.length > 1) {
      ambiguousLibraries[providedLibraryName] = matchingLibraries;
    } else if (matchingLibraries.length === 0) {
      unnecessaryLibraries.push(providedLibraryName);
    }
  }

  if (Object.keys(ambiguousLibraries).length > 0) {
    throw new AmbiguousLibraryNameError(ambiguousLibraries);
  }

  if (unnecessaryLibraries.length > 0) {
    throw new UnnecessaryLibraryError(unnecessaryLibraries);
  }
}

/**
 * Check that each library is only provided once, either by its name or its
 * fully qualified name. If a library is provided more than once, an
 * OverlappingLibrariesError is thrown.
 */
export function checkOverlappingLibraryNames(
  providedLibraries: LibraryAddresses,
  neededLibraries: LibraryLink[],
): void {
  const overlappingLibraries = neededLibraries
    .filter(
      ({ libraryName, libraryFqn }) =>
        providedLibraries[libraryFqn] !== undefined &&
        providedLibraries[libraryName] !== undefined,
    )
    .map(({ libraryFqn }) => libraryFqn);

  if (overlappingLibraries.length === 0) {
    return;
  }

  throw new OverlappingLibrariesError(overlappingLibraries);
}

/**
 * Check if the needed libraries have all their addresses resolved. If an
 * address is missing, it means that the user didn't provide it in the
 * providedLibraries map. In that case, an MissingLibrariesError is thrown.
 */
export function checkMissingLibraryAddresses(
  neededLibraries: LibraryLink[],
): void {
  const missingLibraries = neededLibraries
    .filter(({ address }) => address === undefined)
    .map(({ libraryFqn }) => libraryFqn);

  if (missingLibraries.length === 0) {
    return;
  }

  throw new MissingLibrariesError(missingLibraries);
}
