import type { Result } from "./types.js";
import type { ResolvedNpmPackage } from "../../../../../types/solidity.js";

import { assertHardhatInvariant } from "@nomicfoundation/hardhat-errors";
import { ensureError } from "@nomicfoundation/hardhat-utils/error";
import {
  FileNotFoundError,
  getFileTrueCase,
} from "@nomicfoundation/hardhat-utils/fs";
import { exports } from "resolve.exports";

export enum PathValidationErrorType {
  DOESNT_EXIST = "DOESNT_EXIST",
  CASING_ERROR = "CASING_ERROR",
}

export async function validateFsPath(
  from: string,
  relative: string,
): Promise<
  Result<
    undefined,
    | { type: PathValidationErrorType.DOESNT_EXIST }
    | { type: PathValidationErrorType.CASING_ERROR; correctCasing: string }
  >
> {
  let trueCaseFsPath: string;
  try {
    trueCaseFsPath = await getFileTrueCase(from, relative);
  } catch (error) {
    ensureError(error, FileNotFoundError);

    return {
      success: false,
      error: { type: PathValidationErrorType.DOESNT_EXIST },
    };
  }

  if (relative !== trueCaseFsPath) {
    return {
      success: false,
      error: {
        type: PathValidationErrorType.CASING_ERROR,
        correctCasing: trueCaseFsPath,
      },
    };
  }

  return { success: true, value: undefined };
}

/**
 * Resolves a subpath for a given package, when it uses package#exports
 * @param npmPackage The npm package.
 * @param subpath The supath to resolve. Which must use forward slashes.
 * @returns The resolved subpath. Which uses forward slashes.
 */
export function resolveSubpathWithPackageExports(
  npmPackage: Required<ResolvedNpmPackage>,
  subpath: string,
): Result<string, undefined> {
  let resolveOutput: string[] | void;
  try {
    // As we are resolving Solidity files, the conditions don't really apply,
    // and Solidity package authors don't use them either.
    //
    // We use `resolve.exports` with the appropiate options so that it only
    // takes the `"default"` condition into account.
    resolveOutput = exports(npmPackage, subpath, {
      browser: false,
      conditions: [],
      require: false,
      unsafe: true,
    });
  } catch (error) {
    ensureError(error, Error);

    return { success: false, error: undefined };
  }

  assertHardhatInvariant(
    resolveOutput !== undefined,
    "resolve.exports should always return a result when package.exports exist",
  );

  const resolvedSubpath = resolveOutput[0].slice(2); // skip the leading './'

  return { success: true, value: resolvedSubpath };
}
