/**
 * This file has functions to handle libraries validation and linking.
 *
 * The functions in this file follow the same format that Hardhat uses
 * to name libraries. That is, they receive a map from library names to
 * addresses, where the name can one of:
 *  * The name of the library, if it's unambiguous.
 *  * The fully qualified name of the library, if it's ambiguous.
 *
 * The functions throw in the case of ambiguity, indicating the user
 * how to fix it.
 *
 * @file
 */

import { IgnitionValidationError } from "../../errors";
import { Artifact } from "../../types/artifact";

/**
 * This function validates that the libraries object ensures that libraries:
 *  - Are not repeated (i.e. only the FQN or bare name should be used).
 *  - Are needed by the contract.
 *  - Are not ambiguous.
 *  - Are not missing.
 */
export function validateLibraryNames(
  artifact: Artifact,
  libraryNames: string[]
) {
  validateNotRepeatedLibraries(artifact, libraryNames);

  const requiredLibraries = new Set<string>();
  for (const sourceName of Object.keys(artifact.linkReferences)) {
    for (const libName of Object.keys(artifact.linkReferences[sourceName])) {
      requiredLibraries.add(getFullyQualifiedName(sourceName, libName));
    }
  }

  const libraryNameToParsedName = libraryNames.map((libraryName) =>
    getActualNameForArtifactLibrary(artifact, libraryName)
  );

  for (const parsedName of Object.values(libraryNameToParsedName)) {
    requiredLibraries.delete(
      getFullyQualifiedName(parsedName.sourceName, parsedName.libName)
    );
  }

  if (requiredLibraries.size !== 0) {
    const fullyQualifiedNames = Array.from(requiredLibraries)
      .map((name) => `* ${name}`)
      .join("\n");

    throw new IgnitionValidationError(
      `Invalid libraries for contract ${artifact.contractName}: The following libraries are missing:
  
  ${fullyQualifiedNames}`
    );
  }
}

/**
 * Links the libaries in the artifact's deployment bytecode, trowing if the
 * libraries object is invalid.
 */
export function linkLibraries(
  artifact: Artifact,
  libraries: { [libraryName: string]: string }
): string {
  validateAddresses(artifact, libraries);

  let bytecode = artifact.bytecode;
  for (const [name, address] of Object.entries(libraries)) {
    const actualName = getActualNameForArtifactLibrary(artifact, name);
    const references =
      artifact.linkReferences[actualName.sourceName][actualName.libName];

    for (const ref of references) {
      bytecode = linkReference(bytecode, ref, address);
    }
  }

  return bytecode;
}

function linkReference(
  bytecode: string,
  ref: { start: number; length: number },
  address: string
): string {
  return (
    bytecode.substring(0, ref.start * 2 + 2) +
    address.substring(2) +
    bytecode.substring(ref.start * 2 + 2 + ref.length * 2)
  );
}

/**
 * Validates that a library is not used as both with its fully qualified name and bare name.
 */
function validateNotRepeatedLibraries(
  artifact: Artifact,
  libraryNames: string[]
) {
  for (const inputName of libraryNames) {
    const { sourceName, libName } = parseLibraryName(
      artifact.contractName,
      inputName
    );

    if (sourceName !== undefined && libraryNames.includes(libName)) {
      throw new IgnitionValidationError(
        `Invalid libraries for contract ${artifact.contractName}: The names "${inputName}" and "${libName}" clash with each other, please use qualified names for both.`
      );
    }
  }
}

/**
 * Parses a name that can be either a bare name or a fully qualified name.
 */
function parseLibraryName(
  contractName: string,
  libraryName: string
): {
  sourceName?: string;
  libName: string;
} {
  const parts = libraryName.split(":");

  if (parts.length > 2) {
    throw new IgnitionValidationError(
      `Invalid library name ${libraryName} for contract ${contractName}`
    );
  }

  if (parts.length === 1) {
    return { libName: parts[0] };
  }

  return { sourceName: parts[0], libName: parts[1] };
}

function getFullyQualifiedName(sourceName: string, libName: string): string {
  return `${sourceName}:${libName}`;
}

/**
 * Returns the actual source name and library name for a given library name, throwing
 * if the library is not needed or if the name is ambiguous.
 */
function getActualNameForArtifactLibrary(
  artifact: Artifact,
  libraryName: string
): { sourceName: string; libName: string } {
  const { sourceName, libName } = parseLibraryName(
    artifact.contractName,
    libraryName
  );

  if (sourceName !== undefined) {
    if (
      artifact.linkReferences[sourceName] === undefined ||
      artifact.linkReferences[sourceName][libName] === undefined
    ) {
      throw new IgnitionValidationError(
        `Invalid library ${libraryName} for contract ${artifact.contractName}: this library is not needed by this contract.`
      );
    }

    return { sourceName, libName };
  }

  const bareNameToParsedNames: {
    [name: string]: Array<{ sourceName: string; libName: string }>;
  } = {};

  // TODO: This could be cached, but it's not a hot loop
  for (const sn of Object.keys(artifact.linkReferences)) {
    for (const ln of Object.keys(artifact.linkReferences[sn])) {
      if (bareNameToParsedNames[ln] === undefined) {
        bareNameToParsedNames[ln] = [];
      }

      bareNameToParsedNames[ln].push({ sourceName: sn, libName: ln });
    }
  }

  if (
    bareNameToParsedNames[libName] === undefined ||
    bareNameToParsedNames[libName].length === 0
  ) {
    throw new IgnitionValidationError(
      `Invalid library ${libraryName} for contract ${artifact.contractName}: this library is not needed by this contract.`
    );
  }

  if (bareNameToParsedNames[libName].length > 1) {
    const fullyQualifiedNames = bareNameToParsedNames[libraryName]
      .map(
        (parsed) =>
          `* ${getFullyQualifiedName(parsed.sourceName, parsed.libName)}`
      )
      .join("\n");

    throw new IgnitionValidationError(
      `Invalid libraries for contract ${artifact.contractName}: The name "${libraryName}" is ambiguous, please use one of the following fully qualified names:

${fullyQualifiedNames}`
    );
  }

  return bareNameToParsedNames[libName][0];
}

/**
 * Validates that every address is valid.
 */
function validateAddresses(
  artifact: Artifact,
  libraries: { [libraryName: string]: string }
) {
  for (const [libraryName, address] of Object.entries(libraries)) {
    if (address.match(/^0x[0-9a-fA-F]{40}$/) === null) {
      throw new IgnitionValidationError(
        `Invalid address ${address} for library ${libraryName} of contract ${artifact.contractName}`
      );
    }
  }
}
