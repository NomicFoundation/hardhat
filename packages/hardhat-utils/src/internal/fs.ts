import type { Dirent } from "node:fs";

import fsPromises from "node:fs/promises";
import path from "node:path";

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

/**
 * Recursively walk the directory tree rooted at `dirFrom`, appending the
 * absolute paths of every file accepted by `matches` to `results`. Descent
 * into a subdirectory is gated by `directoryFilter`. When either callback is
 * omitted, every file or directory is accepted.
 */
export async function collectAllFilesMatching(
  dirFrom: string,
  results: string[],
  matches?: (absolutePathToFile: string) => Promise<boolean> | boolean,
  directoryFilter?: (absolutePathToDir: string) => Promise<boolean> | boolean,
): Promise<void> {
  const dirContent = await readdirWithFileTypesOrEmpty(dirFrom);

  await Promise.all(
    dirContent.map(async (dirent) => {
      const absolutePathToFile = path.join(dirFrom, dirent.name);
      if (await isDirectoryDirentAware(absolutePathToFile, dirent)) {
        if (
          directoryFilter === undefined ||
          (await directoryFilter(absolutePathToFile))
        ) {
          await collectAllFilesMatching(
            absolutePathToFile,
            results,
            matches,
            directoryFilter,
          );
        }

        return;
      } else if (matches === undefined || (await matches(absolutePathToFile))) {
        results.push(absolutePathToFile);
      }
    }),
  );
}

/**
 * Recursively walk the directory tree rooted at `dirFrom`, appending the
 * absolute paths of every directory accepted by `matches` to `results`. When
 * a directory matches, its descendants are not explored; when it does not,
 * the walk continues into its subdirectories. When `matches` is omitted,
 * every directory is accepted and recursion stops at the top level.
 */
export async function collectAllDirectoriesMatching(
  dirFrom: string,
  results: string[],
  matches?: (absolutePathToDir: string) => Promise<boolean> | boolean,
): Promise<void> {
  const dirContent = await readdirWithFileTypesOrEmpty(dirFrom);

  await Promise.all(
    dirContent.map(async (dirent) => {
      const absolutePathToFile = path.join(dirFrom, dirent.name);
      if (!(await isDirectoryDirentAware(absolutePathToFile, dirent))) {
        return;
      }

      if (matches === undefined || (await matches(absolutePathToFile))) {
        results.push(absolutePathToFile);
        return;
      }

      await collectAllDirectoriesMatching(absolutePathToFile, results, matches);
    }),
  );
}
