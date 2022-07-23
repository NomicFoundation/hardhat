import fsPromises from "fs/promises";
import fs from "fs";
import path from "path";
import { CustomError } from "../core/errors";

// We use this error to encapsulate any other error possibly thrown by node's
// fs apis, as sometimes their errors don't have stack traces.
export class FileSystemAccessError extends CustomError {}

export class FileNotFoundError extends CustomError {}
export class InvalidDirectoryError extends CustomError {}

/**
 * Returns the real-case version of an absolute path.
 *
 * @throws FileNotFoundError if absolutePath doesn't exist.
 */
export async function getRealCase(absolutePath: string): Promise<string> {
  try {
    return await fsPromises.realpath(absolutePath);
  } catch (e: any) {
    if (e.code === "ENOENT") {
      // eslint-disable-next-line @nomiclabs/hardhat-internal-rules/only-hardhat-error
      throw new FileNotFoundError(`File ${absolutePath} not found`, e);
    }

    // eslint-disable-next-line @nomiclabs/hardhat-internal-rules/only-hardhat-error
    throw new FileSystemAccessError(e.message, e);
  }
}

/**
 * Sync version of getRealCase
 *
 * @see getRealCase
 */
export function getRealCaseSync(absolutePath: string): string {
  try {
    return fs.realpathSync.native(absolutePath);
  } catch (e: any) {
    if (e.code === "ENOENT") {
      // eslint-disable-next-line @nomiclabs/hardhat-internal-rules/only-hardhat-error
      throw new FileNotFoundError(`File ${absolutePath} not found`, e);
    }

    // eslint-disable-next-line @nomiclabs/hardhat-internal-rules/only-hardhat-error
    throw new FileSystemAccessError(e.message, e);
  }
}

/**
 * Returns true if absolutePath exists and it has the same casing in the FS.
 */
export async function fileExistsWithExactCasing(
  absolutePath: string
): Promise<boolean> {
  try {
    const realpath = await getRealCase(absolutePath);
    return realpath === absolutePath;
  } catch (e: any) {
    if (e instanceof FileNotFoundError) {
      return false;
    }

    // eslint-disable-next-line @nomiclabs/hardhat-internal-rules/only-hardhat-error
    throw new FileSystemAccessError(e.message, e);
  }

  return true;
}

/**
 * Returns an array of files (not dirs) that match a condition.
 *
 * @param absolutePathToDir A directory. If it doesn't exist `[]` is returned.
 * @param matches
 */
export async function getAllFilesMatching(
  absolutePathToDir: string,
  matches?: (absolutePathToFile: string) => boolean
): Promise<string[]> {
  let dir;
  try {
    dir = await fsPromises.readdir(absolutePathToDir);
  } catch (e: any) {
    if (e.code === "ENOENT") {
      return [];
    }

    if (e.code === "ENOTDIR") {
      // eslint-disable-next-line @nomiclabs/hardhat-internal-rules/only-hardhat-error
      throw new InvalidDirectoryError(
        `Expected ${absolutePathToDir} to be a directory but it isn't`
      );
    }

    // eslint-disable-next-line @nomiclabs/hardhat-internal-rules/only-hardhat-error
    throw new FileSystemAccessError(e.message, e);
  }

  const results = await Promise.all(
    dir.map(async (file) => {
      const absolutePathToFile = path.join(absolutePathToDir, file);
      const stats = await fsPromises.stat(absolutePathToFile);
      if (stats.isDirectory()) {
        return getAllFilesMatching(absolutePathToFile, matches);
      } else {
        if (matches === undefined || matches(absolutePathToFile)) {
          return absolutePathToFile;
        }
      }
    })
  );

  const filteredResults: Array<string | string[]> =
    results.filter(isNotundefined);

  return filteredResults.flat(1_000_000);
}

export function getAllFilesMatchingSync(
  absolutePathToDir: string,
  matches?: (absolutePathToFile: string) => boolean
): string[] {
  let dir: string[];
  try {
    dir = fs.readdirSync(absolutePathToDir);
  } catch (e: any) {
    if (e.code === "ENOENT") {
      return [];
    }

    if (e.code === "ENOTDIR") {
      // eslint-disable-next-line @nomiclabs/hardhat-internal-rules/only-hardhat-error
      throw new InvalidDirectoryError(
        `Expected ${absolutePathToDir} to be a directory but it isn't`
      );
    }

    // eslint-disable-next-line @nomiclabs/hardhat-internal-rules/only-hardhat-error
    throw new FileSystemAccessError(e.message, e);
  }

  const results = dir.map((file) => {
    const absolutePathToFile = path.join(absolutePathToDir, file);
    const stats = fs.statSync(absolutePathToFile);
    if (stats.isDirectory()) {
      return getAllFilesMatchingSync(absolutePathToFile, matches);
    } else {
      if (matches === undefined || matches(absolutePathToFile)) {
        return absolutePathToFile;
      }
    }
  });

  const filteredResults: Array<string | string[]> =
    results.filter(isNotundefined);

  return filteredResults.flat(1_000_000);
}

function isNotundefined<T>(t: T | undefined): t is T {
  return t !== undefined;
}
