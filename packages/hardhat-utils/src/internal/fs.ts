import type { Dirent } from "node:fs";

import fsPromises from "node:fs/promises";

import { ensureNodeErrnoExceptionError } from "../error.js";
import { FileSystemAccessError, NotADirectoryError } from "../errors/fs.js";
import { isDirectory } from "../fs.js";

/**
 * Like `readdirOrEmpty`, but returns `Dirent` entries to know if an entry is a
 * directory or not without an extra `lstat` syscall.
 */
export async function readdirWithFileTypesOrEmpty(
  dirFrom: string,
): Promise<Dirent[]> {
  try {
    return await fsPromises.readdir(dirFrom, { withFileTypes: true });
  } catch (e) {
    ensureNodeErrnoExceptionError(e);

    if (e.code === "ENOENT") {
      return [];
    }

    if (e.code === "ENOTDIR") {
      throw new NotADirectoryError(dirFrom, e);
    }

    throw new FileSystemAccessError(e.message, e);
  }
}

/**
 * Determines if a dirent refers to a directory, falling back to `lstat` only
 * when the dirent type is unknown.
 */
export async function isDirectoryDirentAware(
  absolutePath: string,
  dirent: Dirent,
): Promise<boolean> {
  if (dirent.isDirectory()) {
    return true;
  }

  if (
    dirent.isFile() ||
    dirent.isSymbolicLink() ||
    dirent.isBlockDevice() ||
    dirent.isCharacterDevice() ||
    dirent.isFIFO() ||
    dirent.isSocket()
  ) {
    return false;
  }

  return await isDirectory(absolutePath);
}
