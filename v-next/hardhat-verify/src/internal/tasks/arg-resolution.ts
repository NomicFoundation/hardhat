import type { LibraryAddresses } from "../libraries.js";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { isObject } from "@nomicfoundation/hardhat-utils/lang";

import { loadModule } from "../module.js";

export async function resolveConstructorArgs(
  constructorArgs: string[],
  constructorArgsPath?: string,
): Promise<unknown[]> {
  const hasArgs = constructorArgs.length > 0;
  const hasPath = constructorArgsPath !== undefined;

  // both args and path are provided
  if (hasArgs && hasPath) {
    throw new HardhatError(
      HardhatError.ERRORS.HARDHAT_VERIFY.VALIDATION.MUTUALLY_EXCLUSIVE_CONSTRUCTOR_ARGS,
    );
  }

  // only args are provided
  if (hasArgs) {
    return constructorArgs;
  }

  // nothing is provided
  if (!hasPath) {
    return [];
  }

  const importedConstructorArgs = await loadModule(constructorArgsPath);

  // TODO: should we check that the imported values are strings?
  // encoding will fail if they are not strings, but we could throw earlier.
  // TODO2: constructorArgs might not be an string[] when called programatically.
  // TODO3: we could split the validation in two parts, one for when the user
  // forgets to export the default value and another for when the user
  // exports a value that is not an string[] and throw better errors.
  if (
    !("default" in importedConstructorArgs) ||
    !Array.isArray(importedConstructorArgs.default)
  ) {
    throw new HardhatError(
      HardhatError.ERRORS.HARDHAT_VERIFY.VALIDATION.INVALID_CONSTRUCTOR_ARGS_MODULE_EXPORT,
      {
        constructorArgsPath,
      },
    );
  }

  return importedConstructorArgs.default;
}

export async function resolveLibraries(
  librariesPath?: string,
): Promise<LibraryAddresses> {
  if (librariesPath === undefined) {
    return {};
  }

  const importedLibraries = await loadModule(librariesPath);

  // TODO: should we check that the imported values are Record<string>?
  // TODO2: we could split the validation in two parts, one for when the user
  // forgets to export the default value and another for when the user
  // exports a value that is not an string[] and throw better errors.
  if (
    !("default" in importedLibraries) ||
    !isObject(importedLibraries.default)
  ) {
    throw new HardhatError(
      HardhatError.ERRORS.HARDHAT_VERIFY.VALIDATION.INVALID_LIBRARIES_MODULE_EXPORT,
      {
        librariesPath,
      },
    );
  }

  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- TODO
  return importedLibraries.default as LibraryAddresses;
}
