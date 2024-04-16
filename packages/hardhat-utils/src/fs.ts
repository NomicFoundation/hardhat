import fsPromises from "node:fs/promises";
import path from "node:path";

import { assertHardhatUtilsInvariant } from "./errors/custom-errors.js";
import { ensureError } from "./errors/catch-utils.js";
import {
  FileNotFoundError,
  FileSystemAccessError,
  InvalidFileFormatError,
  JsonSerializationError,
  FileAlreadyExistsError,
  InvalidDirectoryError,
  IsDirectoryError,
} from "./errors/fs.js";

/**
 * Determines the canonical pathname for a given path, resolving any symbolic
 * links, and returns it.
 *
 * @throws FileNotFoundError if absolutePath doesn't exist.
 * @throws FileSystemAccessError for any other error.
 */
export async function getRealPath(absolutePath: string): Promise<string> {
  try {
    return await fsPromises.realpath(path.normalize(absolutePath));
  } catch (e) {
    ensureError<NodeJS.ErrnoException>(e);
    if (e.code === "ENOENT") {
      throw new FileNotFoundError(absolutePath, e);
    }

    throw new FileSystemAccessError(e.message, e);
  }
}

/**
 * Recursively searches a directory and its subdirectories for files that
 * satisfy the specified condition, returning their absolute paths.
 *
 * @param dirFrom The absolute path of the directory to start the search from.
 * @param matches A function to filter files (not directories).
 * @returns An array of absolute paths. Each file has its true case, except
 *  for the initial dirFrom part, which preserves the given casing.
 *  No order is guaranteed. If dirFrom doesn't exist `[]` is returned.
 * @throws InvalidDirectoryError if dirFrom is not a directory.
 * @throws FileSystemAccessError for any other error.
 */
export async function getAllFilesMatching(
  dirFrom: string,
  matches?: (absolutePathToFile: string) => boolean,
): Promise<string[]> {
  const dirContent = await readdirOrEmpty(dirFrom);

  const results = await Promise.all(
    dirContent.map(async (file) => {
      const absolutePathToFile = path.join(dirFrom, file);
      const stats = await fsPromises.stat(absolutePathToFile);
      if (stats.isDirectory()) {
        return getAllFilesMatching(absolutePathToFile, matches);
      } else if (matches === undefined || matches(absolutePathToFile)) {
        return absolutePathToFile;
      } else {
        return [];
      }
    }),
  );

  return results.flat();
}

/**
 * Determines the true case path of a given relative path from a specified
 * directory, without resolving symbolic links, and returns it.
 *
 * @param from The absolute path of the directory to start the search from.
 * @param relativePath The relative path to get the true case of.
 * @returns The true case of the relative path.
 * @throws FileNotFoundError if the starting directory or the relative path doesn't exist.
 * @throws InvalidDirectoryError if the starting directory is not a directory.
 * @throws FileSystemAccessError for any other error.
 */
export async function getFileTrueCase(
  from: string,
  relativePath: string,
): Promise<string> {
  const dirEntries = await readdirOrEmpty(from);

  const segments = relativePath.split(path.sep);
  const nextDir = segments[0];
  assertHardhatUtilsInvariant(
    nextDir !== undefined,
    "Splitting the path should always return at least one segment.",
  );
  const nextDirLowerCase = nextDir.toLowerCase();

  for (const dirEntry of dirEntries) {
    if (dirEntry.toLowerCase() === nextDirLowerCase) {
      if (segments.length === 1) {
        return dirEntry;
      }

      return path.join(
        dirEntry,
        await getFileTrueCase(
          path.join(from, dirEntry),
          path.relative(nextDir, relativePath),
        ),
      );
    }
  }

  throw new FileNotFoundError(path.join(from, relativePath));
}

/**
 * Checks if a given path is a directory.
 *
 * @param absolutePath The path to check.
 * @returns `true` if the path is a directory, `false` otherwise.
 * @throws FileNotFoundError if the path doesn't exist.
 * @throws FileSystemAccessError for any other error.
 */
export async function isDirectory(absolutePath: string): Promise<boolean> {
  try {
    return (await fsPromises.lstat(absolutePath)).isDirectory();
  } catch (e) {
    ensureError<NodeJS.ErrnoException>(e);
    if (e.code === "ENOENT") {
      throw new FileNotFoundError(absolutePath, e);
    }

    throw new FileSystemAccessError(e.message, e);
  }
}

/**
 * Reads a JSON file and parses it. The encoding used is "utf8".
 *
 * @param absolutePathToFile The path to the file.
 * @returns The parsed JSON object.
 * @throws FileNotFoundError if the file doesn't exist.
 * @throws InvalidFileFormatError if the file is not a valid JSON file.
 * @throws FileSystemAccessError for any other error.
 */
export async function readJsonFile<T>(absolutePathToFile: string): Promise<T> {
  const content = await readUtf8File(absolutePathToFile);
  try {
    return JSON.parse(content.toString());
  } catch (e) {
    ensureError<NodeJS.ErrnoException>(e);
    throw new InvalidFileFormatError(absolutePathToFile, e);
  }
}

/**
 * Writes an object to a JSON file. The encoding used is "utf8" and the file is overwritten.
 *
 * @param absolutePathToFile The path to the file. If the file exists, it will be overwritten.
 * @param object The object to write.
 * @throws JsonSerializationError if the object can't be serialized to JSON.
 * @throws FileNotFoundError if part of the path doesn't exist.
 * @throws FileSystemAccessError for any other error.
 */
export async function writeJsonFile<T>(absolutePathToFile: string, object: T) {
  let content;
  try {
    content = JSON.stringify(object, null, 2);
  } catch (e) {
    ensureError<NodeJS.ErrnoException>(e);
    throw new JsonSerializationError(absolutePathToFile, e);
  }

  await writeUtf8File(absolutePathToFile, content);
}

/**
 * Reads a file and returns its content as a string. The encoding used is "utf8".
 *
 * @param absolutePathToFile The path to the file.
 * @returns The content of the file as a string.
 * @throws FileNotFoundError if the file doesn't exist.
 * @throws FileSystemAccessError for any other error.
 */
export async function readUtf8File(
  absolutePathToFile: string,
): Promise<string> {
  try {
    return await fsPromises.readFile(absolutePathToFile, { encoding: "utf8" });
  } catch (e) {
    ensureError<NodeJS.ErrnoException>(e);
    if (e.code === "ENOENT") {
      throw new FileNotFoundError(absolutePathToFile, e);
    }

    throw new FileSystemAccessError(e.message, e);
  }
}

/**
 * Writes a string to a file. The encoding used is "utf8" and the file is overwritten by default.
 *
 * @param absolutePathToFile The path to the file.
 * @param data The data to write.
 * @param flag The flag to use when writing the file. If not provided, the file will be overwritten.
 * See https://nodejs.org/docs/latest-v20.x/api/fs.html#file-system-flags for more information.
 * @throws FileNotFoundError if part of the path doesn't exist.
 * @throws FileAlreadyExistsError if the file already exists and the flag "x" is used.
 * @throws FileSystemAccessError for any other error.
 */
export async function writeUtf8File(
  absolutePathToFile: string,
  data: string,
  flag?: string,
): Promise<void> {
  try {
    await fsPromises.writeFile(absolutePathToFile, data, {
      encoding: "utf8",
      flag,
    });
  } catch (e) {
    ensureError<NodeJS.ErrnoException>(e);
    if (e.code === "ENOENT") {
      throw new FileNotFoundError(absolutePathToFile, e);
    }

    // flag "x" has been used and the file already exists
    if (e.code === "EEXIST") {
      throw new FileAlreadyExistsError(absolutePathToFile, e);
    }

    throw new FileSystemAccessError(e.message, e);
  }
}

/**
 * Reads a directory and returns its content as an array of strings.
 *
 * @param absolutePathToDir The path to the directory.
 * @returns An array of strings with the names of the files and directories in the directory.
 * @throws FileNotFoundError if the directory doesn't exist.
 * @throws InvalidDirectoryError if the path is not a directory.
 * @throws FileSystemAccessError for any other error.
 */
export async function readdir(absolutePathToDir: string) {
  try {
    return await fsPromises.readdir(absolutePathToDir);
  } catch (e) {
    ensureError<NodeJS.ErrnoException>(e);
    if (e.code === "ENOENT") {
      throw new FileNotFoundError(absolutePathToDir, e);
    }

    if (e.code === "ENOTDIR") {
      throw new InvalidDirectoryError(absolutePathToDir, e);
    }

    throw new FileSystemAccessError(e.message, e);
  }
}

/**
 * Wrapper around `readdir` that returns an empty array if the directory doesn't exist.
 *
 * @see readdir
 */
async function readdirOrEmpty(dirFrom: string): Promise<string[]> {
  try {
    return await readdir(dirFrom);
  } catch (error) {
    if (error instanceof FileNotFoundError) {
      return [];
    }
    throw error;
  }
}

/**
 * Creates a directory and any necessary directories along the way. If the directory already exists,
 * nothing is done.
 *
 * @param absolutePath The path to the directory to create.
 * @throws FileSystemAccessError for any error.
 */
export async function mkdir(absolutePath: string): Promise<void> {
  try {
    await fsPromises.mkdir(absolutePath, { recursive: true });
  } catch (e) {
    ensureError<NodeJS.ErrnoException>(e);
    throw new FileSystemAccessError(e.message, e);
  }
}

/**
 * Retrieves the last change time of a file or directory's properties.
 * This includes changes to the file's metadata or contents.
 *
 * @param absolutePath The absolute path to the file or directory.
 * @returns The time of the last change as a Date object.
 * @throws FileNotFoundError if the path does not exist.
 * @throws FileSystemAccessError for any other error.
 */
export async function getChangeTime(absolutePath: string): Promise<Date> {
  try {
    const stats = await fsPromises.stat(absolutePath);
    return stats.ctime;
  } catch (e) {
    ensureError<NodeJS.ErrnoException>(e);
    if (e.code === "ENOENT") {
      throw new FileNotFoundError(absolutePath, e);
    }

    throw new FileSystemAccessError(e.message, e);
  }
}

/**
 * Checks if a file or directory exists.
 *
 * @param absolutePath The absolute path to the file or directory.
 * @returns A boolean indicating whether the file or directory exists.
 */
export async function exists(absolutePath: string): Promise<boolean> {
  try {
    await fsPromises.access(absolutePath);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Copies a file from a source to a destination.
 * If the destination file already exists, it will be overwritten.
 *
 * @param source The path to the source file. It can't be a directory.
 * @param destination The path to the destination file. It can't be a directory.
 * @throws FileNotFoundError if the source path or the destination path doesn't exist.
 * @throws IsDirectoryError if the source path or the destination path is a directory.
 * @throws FileSystemAccessError for any other error.
 */
export async function copy(source: string, destination: string): Promise<void> {
  try {
    await fsPromises.copyFile(source, destination);
  } catch (e) {
    ensureError<NodeJS.ErrnoException>(e);
    if (e.code === "ENOENT") {
      if (!(await exists(source))) {
        throw new FileNotFoundError(source, e);
      }
      if (!(await exists(destination))) {
        throw new FileNotFoundError(destination, e);
      }
    }

    if (e.code === "EISDIR") {
      if (await isDirectory(source)) {
        throw new IsDirectoryError(source, e);
      }
      if (await isDirectory(destination)) {
        throw new IsDirectoryError(destination, e);
      }
    }

    throw new FileSystemAccessError(e.message, e);
  }
}

/**
 * Removes a file or directory recursively.
 * Exceptions are ignored for non-existent paths.
 *
 * @param absolutePath The path to the file or directory to remove.
 * @throws FileSystemAccessError for any error, except for non-existent path errors.
 */
export async function remove(absolutePath: string): Promise<void> {
  try {
    await fsPromises.rm(absolutePath, {
      recursive: true,
      force: true,
      maxRetries: 3,
    });
  } catch (e) {
    ensureError<NodeJS.ErrnoException>(e);
    throw new FileSystemAccessError(e.message, e);
  }
}

export async function chmod(
  absolutePath: string,
  mode: string | number,
): Promise<void> {
  try {
    await fsPromises.chmod(absolutePath, mode);
  } catch (e) {
    ensureError<NodeJS.ErrnoException>(e);
    if (e.code === "ENOENT") {
      throw new FileNotFoundError(absolutePath, e);
    }

    throw new FileSystemAccessError(e.message, e);
  }
}
