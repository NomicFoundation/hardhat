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
    [sourceName: string]: {
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
export function checkAmbiguousOrUnnecessaryLinks(
  providedLibraries: LibraryAddresses,
  neededLibraries: LibraryLink[],
): void {
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
export function checkOverlappingLibraryNames(
  providedLibraries: LibraryAddresses,
  neededLibraries: LibraryLink[],
): void {
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
export function checkMissingLibraryAddresses(
  neededLibraries: LibraryLink[],
): void {
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
