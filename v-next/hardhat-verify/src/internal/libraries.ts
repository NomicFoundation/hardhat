import type { ContractInformation } from "./contract.js";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { isAddress } from "@nomicfoundation/hardhat-utils/eth";
import { getPrefixedHexString } from "@nomicfoundation/hardhat-utils/hex";
import { parseFullyQualifiedName } from "hardhat/utils/contract-names";

export interface LibraryInformation {
  libraries: SourceLibraries;
  undetectableLibraries: string[];
}

export type SourceLibraries = Record<
  /* source file name */ string,
  LibraryAddresses
>;

export type LibraryAddresses = Record<
  /* library name */ string,
  /* address */ string
>;

/**
 * Resolves all required library information for contract verification.
 *
 * Processes the link references from the contract's creation bytecode and the
 * deployed bytecode to determine which libraries are used, which can be
 * detected automatically, and which must be provided by the user. It merges
 * user-specified library addresses with those detected from the bytecode,
 * ensuring there are no conflicts or duplicates.
 *
 * @param contractInformation Information about the contract, including
 * compiler output and deployed bytecode.
 * @param userLibraryAddresses Mapping of user-specified library names (short
 * or FQN) to addresses.
 * @returns An object containing all resolved library addresses and the list of
 * undetectable libraries.
 *   - libraries: Mapping of source names to library names to addresses.
 *   - undetectableLibraries: Array of library FQNs that cannot be detected
 * automatically.
 * @throws {HardhatError} with the descriptor:
 *   - INVALID_LIBRARY_ADDRESS if a user-provided library address is invalid.
 *   - DUPLICATED_LIBRARY if the same library is specified more than once
 * (by name or FQN).
 *   - UNUSED_LIBRARY if a specified library is not used by the contract.
 *   - LIBRARY_MULTIPLE_MATCHES if a provided library name is ambiguous
 * (matches multiple libraries).
 *   - LIBRARY_ADDRESSES_MISMATCH if a library address provided by the user
 * conflicts with an address detected from the bytecode.
 *   - MISSING_LIBRARY_ADDRESSES if any required library addresses are
 * missing.
 */
export function resolveLibraryInformation(
  contractInformation: ContractInformation,
  userLibraryAddresses: LibraryAddresses,
): LibraryInformation {
  const bytecodeLinkReferences =
    contractInformation.compilerOutputContract.evm?.bytecode?.linkReferences ??
    {};
  const deployedBytecodeLinkReferences =
    contractInformation.compilerOutputContract.evm?.deployedBytecode
      ?.linkReferences ?? {};

  const allLibraryFqns = getLibraryFqns(bytecodeLinkReferences);
  const detectableLibraryFqns = getLibraryFqns(deployedBytecodeLinkReferences);
  const undetectableLibraryFqns = allLibraryFqns.filter(
    (lib) => !detectableLibraryFqns.some((detLib) => detLib === lib),
  );

  const userLibraries = resolveUserLibraries(
    allLibraryFqns,
    detectableLibraryFqns,
    undetectableLibraryFqns,
    userLibraryAddresses,
    contractInformation.contract,
  );

  const detectableLibraries = getDetectableLibrariesFromBytecode(
    deployedBytecodeLinkReferences,
    contractInformation.deployedBytecode,
  );

  const mergedLibraries = mergeLibraries(userLibraries, detectableLibraries);

  const mergedLibraryFqns = getLibraryFqns(mergedLibraries);
  if (mergedLibraryFqns.length < allLibraryFqns.length) {
    const missingLibraries = allLibraryFqns.filter(
      (lib) => !mergedLibraryFqns.some((mergedLib) => lib === mergedLib),
    );
    const missingList = missingLibraries.map((x) => `  * ${x}`).join("\n");

    throw new HardhatError(
      HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.MISSING_LIBRARY_ADDRESSES,
      {
        contract: contractInformation.contract,
        missingList,
      },
    );
  }

  return {
    libraries: mergedLibraries,
    undetectableLibraries: undetectableLibraryFqns,
  };
}

/**
 * Returns a list of fully qualified library names in the format `source:library`.
 *
 * @param libraries Nested mapping from source name to library names.
 * @returns An array of fully qualified names (e.g., "contracts/Lib.sol:MyLib").
 */
export function getLibraryFqns(
  libraries: Record<string, Record<string, unknown>>,
): string[] {
  return Object.entries(libraries).flatMap(([sourceName, sourceLibraries]) =>
    Object.keys(sourceLibraries).map(
      (libraryName) => `${sourceName}:${libraryName}`,
    ),
  );
}

/**
 * Resolves and validates user-specified libraries for contract verification.
 *
 * Matches each user-provided library name or FQN to the contract's required
 * libraries, ensures the address is valid, checks for ambiguity, and prevents
 * duplicates.
 *
 * @param allLibraryFqns All fully qualified library names (`source:library`)
 * used by the contract, derived from the keys in the `linkReferences`
 * mapping of the contract’s creation bytecode. Includes both detectable and
 * undetectable libraries.
 * @param detectableLibraryFqns Fully qualified library names present in the
 * `linkReferences` mapping of the deployed bytecode. These libraries can be
 * detected automatically and do not require user-specified addresses.
 * @param undetectableLibraryFqns Fully qualified library names found in the
 * creation bytecode’s `linkReferences` but not in the deployed bytecode’s
 * `linkReferences`. These must be specified by the user.
 * @param userLibraryAddresses User-provided mapping from library name (short
 * or FQN) to address.
 * @param contract Fully qualified name of the contract.
 * @returns A mapping of source names to library names to addresses.
 * @throws {HardhatError} with the descriptor:
 *   - INVALID_LIBRARY_ADDRESS if a user-provided library address is invalid.
 *   - DUPLICATED_LIBRARY if the same library is specified more than once
 * (by name or FQN).
 *   - UNUSED_LIBRARY if a specified library is not used by the contract.
 *   - LIBRARY_MULTIPLE_MATCHES if a provided library name is ambiguous
 * (matches multiple libraries).
 */
export function resolveUserLibraries(
  allLibraryFqns: string[],
  detectableLibraryFqns: string[],
  undetectableLibraryFqns: string[],
  userLibraryAddresses: LibraryAddresses,
  contract: string,
): SourceLibraries {
  const seenLibraryFqns: Set<string> = new Set();
  const resolvedLibraries: SourceLibraries = {};

  for (const [userLibName, userLibAddress] of Object.entries(
    userLibraryAddresses,
  )) {
    // TODO: we should move this validation to the arg resolution step
    if (!isAddress(userLibAddress)) {
      throw new HardhatError(
        HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.INVALID_LIBRARY_ADDRESS,
        {
          contract,
          library: userLibName,
          address: userLibAddress,
        },
      );
    }

    const foundLibraryFqn = lookupLibrary(
      allLibraryFqns,
      detectableLibraryFqns,
      undetectableLibraryFqns,
      userLibName,
      contract,
    );
    const { sourceName: foundLibSource, contractName: foundLibName } =
      parseFullyQualifiedName(foundLibraryFqn);

    // The only way for this library to be already mapped is for it to be given
    // twice in the libraries user input: once as a library name and another as
    // a fully qualified library name
    if (seenLibraryFqns.has(foundLibraryFqn)) {
      throw new HardhatError(
        HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.DUPLICATED_LIBRARY,
        {
          library: foundLibName,
          libraryFqn: foundLibraryFqn,
        },
      );
    }

    seenLibraryFqns.add(foundLibraryFqn);
    if (resolvedLibraries[foundLibSource] === undefined) {
      resolvedLibraries[foundLibSource] = {};
    }
    resolvedLibraries[foundLibSource][foundLibName] = userLibAddress;
  }

  return resolvedLibraries;
}

/**
 * Searches for a library by its name or fully qualified name in the array of
 * all libraries. Throws an error if the library is not found or if multiple
 * libraries match the name.
 */
export function lookupLibrary(
  allLibraryFqns: string[],
  detectableLibraryFqns: string[],
  undetectableLibraryFqns: string[],
  libraryName: string,
  contract: string,
): string {
  const matchingLibraries = allLibraryFqns.filter(
    (libFqn) => libFqn === libraryName || libFqn.split(":")[1] === libraryName,
  );

  if (matchingLibraries.length === 0) {
    const lines = [];

    if (undetectableLibraryFqns.length > 0) {
      lines.push(...undetectableLibraryFqns.map((x) => `  * ${x}`));
    }

    if (detectableLibraryFqns.length > 0) {
      lines.push(
        ...detectableLibraryFqns.map((x) => `  * ${x} (optional)`),
        "Libraries marked as optional don't need to be specified since their addresses are autodetected by the plugin.",
      );
    }

    const suggestion =
      allLibraryFqns.length > 0
        ? [
            "This contract uses the following external libraries:",
            ...lines,
          ].join("\n")
        : "This contract doesn't use any external libraries.";

    throw new HardhatError(
      HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.UNUSED_LIBRARY,
      {
        contract,
        library: libraryName,
        suggestion,
      },
    );
  }

  if (matchingLibraries.length > 1) {
    const fqnList = matchingLibraries.map((x) => `  * ${x}`).join("\n");

    throw new HardhatError(
      HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.LIBRARY_MULTIPLE_MATCHES,
      {
        contract,
        library: libraryName,
        fqnList,
      },
    );
  }

  return matchingLibraries[0];
}

/**
 * Extracts linked library addresses from deployed bytecode using link
 * references. Assumes all offsets for a given library will have the same
 * address and only reads the first occurrence.
 */
export function getDetectableLibrariesFromBytecode(
  linkReferences:
    | {
        [sourceName: string]: {
          [libraryName: string]: Array<{
            start: number;
            length: 20;
          }>;
        };
      }
    | undefined = {},
  deployedBytecode: string,
): SourceLibraries {
  const sourceLibraries: SourceLibraries = {};

  for (const [sourceName, libOffsets] of Object.entries(linkReferences)) {
    if (sourceLibraries[sourceName] === undefined) {
      sourceLibraries[sourceName] = {};
    }

    for (const [libName, [{ start, length }]] of Object.entries(libOffsets)) {
      sourceLibraries[sourceName][libName] = getPrefixedHexString(
        deployedBytecode.slice(start * 2, (start + length) * 2),
      );
    }
  }

  return sourceLibraries;
}

/**
 * Merges user-specified and detected library addresses, ensuring there are no
 * conflicts. Throws if a library address is provided by the user and also
 * detected, but the addresses do not match.
 */
export function mergeLibraries(
  userLibraries: SourceLibraries,
  detectedLibraries: SourceLibraries,
): SourceLibraries {
  const conflicts: Array<{
    library: string;
    detectedAddress: string;
    userAddress: string;
  }> = [];
  for (const [sourceName, userLibAddresses] of Object.entries(userLibraries)) {
    for (const [userLibName, userLibAddress] of Object.entries(
      userLibAddresses,
    )) {
      if (
        sourceName in detectedLibraries &&
        userLibName in detectedLibraries[sourceName]
      ) {
        const detectedLibAddress = detectedLibraries[sourceName][userLibName];
        // detectedLibAddress may not always be lowercase due to extraction logic
        if (userLibAddress.toLowerCase() !== detectedLibAddress.toLowerCase()) {
          conflicts.push({
            library: `${sourceName}:${userLibName}`,
            detectedAddress: detectedLibAddress,
            userAddress: userLibAddress,
          });
        }
      }
    }
  }

  if (conflicts.length > 0) {
    const conflictList = conflicts
      .map(
        ({ library, userAddress, detectedAddress }) =>
          `  * ${library}\ngiven address: ${userAddress}\ndetected address: ${detectedAddress}`,
      )
      .join("\n");

    throw new HardhatError(
      HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.LIBRARY_ADDRESSES_MISMATCH,
      {
        conflictList,
      },
    );
  }

  const merge = (
    targetLibraries: SourceLibraries,
    sourceLibraries: SourceLibraries,
  ) => {
    for (const [sourceName, sourceLibAddresses] of Object.entries(
      sourceLibraries,
    )) {
      targetLibraries[sourceName] = {
        ...targetLibraries[sourceName],
        ...sourceLibAddresses,
      };
    }
  };
  const mergedLibraries: SourceLibraries = {};
  merge(mergedLibraries, userLibraries);
  merge(mergedLibraries, detectedLibraries);

  return mergedLibraries;
}
