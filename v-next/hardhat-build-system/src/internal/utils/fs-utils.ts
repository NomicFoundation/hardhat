import path from "node:path";
import fs from "node:fs";
import { readdir } from "@nomicfoundation/hardhat-utils/fs";
import { CustomError, assertHardhatInvariant } from "../errors/errors.js";

export class InvalidDirectoryError extends CustomError {
  constructor(filePath: string, parent: Error) {
    super(`Invalid directory ${filePath}`, parent);
  }
}

// We use this error to encapsulate any other error possibly thrown by node's
// fs apis, as sometimes their errors don't have stack traces.
export class FileSystemAccessError extends CustomError {}

/**
 * Returns the true case relative path of `relativePath` from `from`, without
 * resolving symlinks.
 */
export async function getFileTrueCase(
  from: string,
  relativePath: string,
): Promise<string> {
  const dirEntries = await readdir(from);

  const parts = relativePath.split(path.sep);

  assertHardhatInvariant(
    parts[0] !== undefined,
    "Part of the relativePath is undefined",
  );

  const nextDirLowerCase = parts[0].toLowerCase();

  for (const dirEntry of dirEntries) {
    if (dirEntry.toLowerCase() === nextDirLowerCase) {
      if (parts.length === 1) {
        return dirEntry;
      }

      return path.join(
        dirEntry,
        await getFileTrueCase(
          path.join(from, dirEntry),
          path.relative(parts[0], relativePath),
        ),
      );
    }
  }

  // eslint-disable-next-line @nomicfoundation/hardhat-internal-rules/only-hardhat-error
  throw new FileNotFoundError(path.join(from, relativePath));
}

export class FileNotFoundError extends CustomError {
  constructor(filePath: string, parent?: Error) {
    super(`File ${filePath} not found`, parent);
  }
}

function readdirSync(absolutePathToDir: string) {
  try {
    return fs.readdirSync(absolutePathToDir);
  } catch (e: any) {
    if (e.code === "ENOENT") {
      return [];
    }

    if (e.code === "ENOTDIR") {
      // eslint-disable-next-line @nomicfoundation/hardhat-internal-rules/only-hardhat-error
      throw new InvalidDirectoryError(absolutePathToDir, e);
    }

    // eslint-disable-next-line @nomicfoundation/hardhat-internal-rules/only-hardhat-error
    throw new FileSystemAccessError(e.message, e);
  }
}

/**
 * Sync version of getFileTrueCase
 *
 * @see getFileTrueCase
 */
export function getFileTrueCaseSync(
  from: string,
  relativePath: string,
): string {
  const dirEntries = readdirSync(from);

  const parts = relativePath.split(path.sep);

  assertHardhatInvariant(
    parts[0] !== undefined,
    "Part of the relativePath is undefined",
  );

  const nextDirLowerCase = parts[0].toLowerCase();

  for (const dirEntry of dirEntries) {
    if (dirEntry.toLowerCase() === nextDirLowerCase) {
      if (parts.length === 1) {
        return dirEntry;
      }

      return path.join(
        dirEntry,
        getFileTrueCaseSync(
          path.join(from, dirEntry),
          path.relative(parts[0], relativePath),
        ),
      );
    }
  }

  // eslint-disable-next-line @nomicfoundation/hardhat-internal-rules/only-hardhat-error
  throw new FileNotFoundError(path.join(from, relativePath));
}
