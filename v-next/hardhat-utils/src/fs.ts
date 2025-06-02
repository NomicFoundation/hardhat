import type { JsonTypes, ParsedElementInfo } from "@streamparser/json-node";
import type { FileHandle } from "node:fs/promises";

import fsPromises from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pipeline } from "node:stream/promises";

import { JSONParser } from "@streamparser/json-node";
import { JsonStreamStringify } from "json-stream-stringify";

import { ensureError, ensureNodeErrnoExceptionError } from "./error.js";
import {
  FileNotFoundError,
  FileSystemAccessError,
  InvalidFileFormatError,
  JsonSerializationError,
  FileAlreadyExistsError,
  NotADirectoryError,
  IsDirectoryError,
  DirectoryNotEmptyError,
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
    ensureNodeErrnoExceptionError(e);
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
 * @param directoryFilter A function to filter which directories to recurse into
 * @returns An array of absolute paths. Each file has its true case, except
 *  for the initial dirFrom part, which preserves the given casing.
 *  No order is guaranteed. If dirFrom doesn't exist `[]` is returned.
 * @throws NotADirectoryError if dirFrom is not a directory.
 * @throws FileSystemAccessError for any other error.
 */
export async function getAllFilesMatching(
  dirFrom: string,
  matches?: (absolutePathToFile: string) => Promise<boolean>,
  directoryFilter?: (absolutePathToDir: string) => boolean,
): Promise<string[]> {
  const dirContent = await readdirOrEmpty(dirFrom);

  const results = await Promise.all(
    dirContent.map(async (file) => {
      const absolutePathToFile = path.join(dirFrom, file);
      if (await isDirectory(absolutePathToFile)) {
        if (
          directoryFilter === undefined ||
          directoryFilter(absolutePathToFile)
        ) {
          return getAllFilesMatching(
            absolutePathToFile,
            matches,
            directoryFilter,
          );
        }

        return [];
      } else if (matches === undefined || (await matches(absolutePathToFile))) {
        return absolutePathToFile;
      } else {
        return [];
      }
    }),
  );

  return results.flat();
}

/**
 * Recursively searches a directory and its subdirectories for directories that
 * satisfy the specified condition, returning their absolute paths. Once a
 * directory is found, its subdirectories are not searched.
 *
 * Note: dirFrom is never returned, nor `matches` is called on it.
 *
 * @param dirFrom The absolute path of the directory to start the search from.
 * @param matches A function to filter directories (not files).
 * @returns An array of absolute paths. Each path has its true case, except
 *  for the initial dirFrom part, which preserves the given casing.
 *  No order is guaranteed. If dirFrom doesn't exist `[]` is returned.
 * @throws NotADirectoryError if dirFrom is not a directory.
 * @throws FileSystemAccessError for any other error.
 */
export async function getAllDirectoriesMatching(
  dirFrom: string,
  matches?: (absolutePathToDir: string) => Promise<boolean>,
): Promise<string[]> {
  const dirContent = await readdirOrEmpty(dirFrom);

  const results = await Promise.all(
    dirContent.map(async (file) => {
      const absolutePathToFile = path.join(dirFrom, file);
      if (!(await isDirectory(absolutePathToFile))) {
        return [];
      }

      if (matches === undefined || (await matches(absolutePathToFile))) {
        return absolutePathToFile;
      }

      return getAllDirectoriesMatching(absolutePathToFile, matches);
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
 * @throws NotADirectoryError if the starting directory is not a directory.
 * @throws FileSystemAccessError for any other error.
 */
export async function getFileTrueCase(
  from: string,
  relativePath: string,
): Promise<string> {
  const dirEntries = await readdirOrEmpty(from);

  const segments = relativePath.split(path.sep);
  const nextDir = segments[0];
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
    ensureNodeErrnoExceptionError(e);
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
 * @throws IsDirectoryError if the path is a directory instead of a file.
 * @throws FileSystemAccessError for any other error.
 */
export async function readJsonFile<T>(absolutePathToFile: string): Promise<T> {
  const content = await readUtf8File(absolutePathToFile);
  try {
    return JSON.parse(content.toString());
  } catch (e) {
    ensureError(e);
    throw new InvalidFileFormatError(absolutePathToFile, e);
  }
}

/**
 * Reads a JSON file as a stream and parses it. The encoding used is "utf8".
 * This function should be used when parsing very large JSON files.
 *
 * @param absolutePathToFile The path to the file.
 * @returns The parsed JSON object.
 * @throws FileNotFoundError if the file doesn't exist.
 * @throws InvalidFileFormatError if the file is not a valid JSON file.
 * @throws IsDirectoryError if the path is a directory instead of a file.
 * @throws FileSystemAccessError for any other error.
 */
export async function readJsonFileAsStream<T>(
  absolutePathToFile: string,
): Promise<T> {
  let fileHandle: FileHandle | undefined;

  try {
    fileHandle = await fsPromises.open(absolutePathToFile, "r");

    const fileReadStream = fileHandle.createReadStream();

    // NOTE: We set a separator to disable self-closing to be able to use the parser
    // in the stream.pipeline context; see https://github.com/juanjoDiaz/streamparser-json/issues/47
    const jsonParser = new JSONParser({
      separator: "",
    });

    const result: T | undefined = await pipeline(
      fileReadStream,
      jsonParser,
      async (
        elements: AsyncIterable<ParsedElementInfo.ParsedElementInfo>,
      ): Promise<any | undefined> => {
        let value: JsonTypes.JsonPrimitive | JsonTypes.JsonStruct | undefined;
        for await (const element of elements) {
          value = element.value;
        }
        return value;
      },
    );

    if (result === undefined) {
      throw new Error("No data");
    }

    return result;
  } catch (e) {
    ensureError(e);

    // If the code is defined, we assume the error to be related to the file system
    if ("code" in e) {
      if (e.code === "ENOENT") {
        throw new FileNotFoundError(absolutePathToFile, e);
      }

      if (e.code === "EISDIR") {
        throw new IsDirectoryError(absolutePathToFile, e);
      }

      // If the code is defined, we assume the error to be related to the file system
      if (e.code !== undefined) {
        throw new FileSystemAccessError(absolutePathToFile, e);
      }
    }

    // Otherwise, we assume the error to be related to the file formatting
    throw new InvalidFileFormatError(absolutePathToFile, e);
  } finally {
    // Explicitly closing the file handle to fully release the underlying resources
    await fileHandle?.close();
  }
}

/**
 * Writes an object to a JSON file. The encoding used is "utf8" and the file is overwritten.
 * If part of the path doesn't exist, it will be created.
 *
 * @param absolutePathToFile The path to the file. If the file exists, it will be overwritten.
 * @param object The object to write.
 * @throws JsonSerializationError if the object can't be serialized to JSON.
 * @throws FileSystemAccessError for any other error.
 */
export async function writeJsonFile<T>(
  absolutePathToFile: string,
  object: T,
): Promise<void> {
  let content;
  try {
    content = JSON.stringify(object, null, 2);
  } catch (e) {
    ensureError(e);
    throw new JsonSerializationError(absolutePathToFile, e);
  }

  await writeUtf8File(absolutePathToFile, content);
}

/**
 * Writes an object to a JSON file as stream. The encoding used is "utf8" and the file is overwritten.
 * If part of the path doesn't exist, it will be created.
 * This function should be used when stringifying very large JSON objects.
 *
 * @param absolutePathToFile The path to the file. If the file exists, it will be overwritten.
 * @param object The object to write.
 * @throws JsonSerializationError if the object can't be serialized to JSON.
 * @throws FileSystemAccessError for any other error.
 */
export async function writeJsonFileAsStream<T>(
  absolutePathToFile: string,
  object: T,
): Promise<void> {
  const dirPath = path.dirname(absolutePathToFile);
  const dirExists = await exists(dirPath);
  if (!dirExists) {
    await mkdir(dirPath);
  }

  let fileHandle: FileHandle | undefined;

  try {
    fileHandle = await fsPromises.open(absolutePathToFile, "w");

    const jsonStream = new JsonStreamStringify(object);
    const fileWriteStream = fileHandle.createWriteStream();

    await pipeline(jsonStream, fileWriteStream);
  } catch (e) {
    ensureError(e);
    // if the directory was created, we should remove it
    if (dirExists === false) {
      try {
        await remove(dirPath);
        // we don't want to override the original error
      } catch (_error) {}
    }

    // If the code is defined, we assume the error to be related to the file system
    if ("code" in e && e.code !== undefined) {
      throw new FileSystemAccessError(e.message, e);
    }

    // Otherwise, we assume the error to be related to the file formatting
    throw new JsonSerializationError(absolutePathToFile, e);
  } finally {
    // NOTE: Historically, not closing the file handle caused issues on Windows,
    // for example, when trying to move the file previously written to by this function
    await fileHandle?.close();
  }
}

/**
 * Reads a file and returns its content as a string. The encoding used is "utf8".
 *
 * @param absolutePathToFile The path to the file.
 * @returns The content of the file as a string.
 * @throws FileNotFoundError if the file doesn't exist.
 * @throws IsDirectoryError if the path is a directory instead of a file.
 * @throws FileSystemAccessError for any other error.
 */
export async function readUtf8File(
  absolutePathToFile: string,
): Promise<string> {
  try {
    return await fsPromises.readFile(absolutePathToFile, { encoding: "utf8" });
  } catch (e) {
    ensureNodeErrnoExceptionError(e);

    if (e.code === "ENOENT") {
      throw new FileNotFoundError(absolutePathToFile, e);
    }

    if (e.code === "EISDIR") {
      throw new IsDirectoryError(absolutePathToFile, e);
    }

    throw new FileSystemAccessError(e.message, e);
  }
}

/**
 * Writes a string to a file. The encoding used is "utf8" and the file is overwritten by default.
 * If part of the path doesn't exist, it will be created.
 *
 * @param absolutePathToFile The path to the file.
 * @param data The data to write.
 * @param flag The flag to use when writing the file. If not provided, the file will be overwritten.
 * See https://nodejs.org/docs/latest-v20.x/api/fs.html#file-system-flags for more information.
 * @throws FileAlreadyExistsError if the file already exists and the flag "x" is used.
 * @throws FileSystemAccessError for any other error.
 */
export async function writeUtf8File(
  absolutePathToFile: string,
  data: string,
  flag?: string,
): Promise<void> {
  const dirPath = path.dirname(absolutePathToFile);
  const dirExists = await exists(dirPath);
  if (!dirExists) {
    await mkdir(dirPath);
  }

  try {
    await fsPromises.writeFile(absolutePathToFile, data, {
      encoding: "utf8",
      flag,
    });
  } catch (e) {
    ensureNodeErrnoExceptionError(e);
    // if the directory was created, we should remove it
    if (dirExists === false) {
      try {
        await remove(dirPath);
        // we don't want to override the original error
      } catch (_error) {}
    }

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
 * Reads a file and returns its content as a Uint8Array.
 *
 * @param absolutePathToFile The path to the file.
 * @returns The content of the file as a Uint8Array.
 * @throws FileNotFoundError if the file doesn't exist.
 * @throws IsDirectoryError if the path is a directory instead of a file.
 * @throws FileSystemAccessError for any other error.
 */
export async function readBinaryFile(
  absolutePathToFile: string,
): Promise<Uint8Array> {
  try {
    const buffer = await fsPromises.readFile(absolutePathToFile);
    return new Uint8Array(buffer);
  } catch (e) {
    ensureNodeErrnoExceptionError(e);

    if (e.code === "ENOENT") {
      throw new FileNotFoundError(absolutePathToFile, e);
    }

    if (e.code === "EISDIR") {
      throw new IsDirectoryError(absolutePathToFile, e);
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
 * @throws NotADirectoryError if the path is not a directory.
 * @throws FileSystemAccessError for any other error.
 */
export async function readdir(absolutePathToDir: string): Promise<string[]> {
  try {
    return await fsPromises.readdir(absolutePathToDir);
  } catch (e) {
    ensureNodeErrnoExceptionError(e);
    if (e.code === "ENOENT") {
      throw new FileNotFoundError(absolutePathToDir, e);
    }

    if (e.code === "ENOTDIR") {
      throw new NotADirectoryError(absolutePathToDir, e);
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
    ensureNodeErrnoExceptionError(e);
    throw new FileSystemAccessError(e.message, e);
  }
}

/**
 * Alias for `mkdir`.
 * @see mkdir
 */
export const ensureDir: typeof mkdir = mkdir;

/**
 * Creates a temporary directory with the specified prefix.
 *
 * @param prefix The prefix to use for the temporary directory.
 * @returns The absolute path to the created temporary directory.
 * @throws FileSystemAccessError for any error.
 */
export async function mkdtemp(prefix: string): Promise<string> {
  try {
    return await fsPromises.mkdtemp(path.join(tmpdir(), prefix));
  } catch (e) {
    ensureNodeErrnoExceptionError(e);
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
    ensureNodeErrnoExceptionError(e);
    if (e.code === "ENOENT") {
      throw new FileNotFoundError(absolutePath, e);
    }

    throw new FileSystemAccessError(e.message, e);
  }
}

/**
 * Retrieves the last access time of a file or directory's properties.
 *
 * @param absolutePath The absolute path to the file or directory.
 * @returns The time of the last access as a Date object.
 * @throws FileNotFoundError if the path does not exist.
 * @throws FileSystemAccessError for any other error.
 */
export async function getAccessTime(absolutePath: string): Promise<Date> {
  try {
    const stats = await fsPromises.stat(absolutePath);
    return stats.atime;
  } catch (e) {
    ensureNodeErrnoExceptionError(e);
    if (e.code === "ENOENT") {
      throw new FileNotFoundError(absolutePath, e);
    }

    throw new FileSystemAccessError(e.message, e);
  }
}

/**
 * Retrieves the size of a file.
 *
 * @param absolutePath The absolute path to the file.
 * @returns The size of the file in bytes.
 * @throws FileNotFoundError if the path does not exist.
 * @throws FileSystemAccessError for any other error.
 */
export async function getFileSize(absolutePath: string): Promise<number> {
  try {
    const stats = await fsPromises.stat(absolutePath);
    return stats.size;
  } catch (e) {
    ensureNodeErrnoExceptionError(e);
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
  } catch (_error) {
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
    ensureNodeErrnoExceptionError(e);
    if (e.code === "ENOENT") {
      if (!(await exists(source))) {
        throw new FileNotFoundError(source, e);
      }
      if (!(await exists(destination))) {
        throw new FileNotFoundError(destination, e);
      }
    }

    // On linux, trying to copy a directory will throw EISDIR,
    // on Windows it will throw EPERM, and on macOS it will throw ENOTSUP.
    if (e.code === "EISDIR" || e.code === "EPERM" || e.code === "ENOTSUP") {
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
 * Moves a file or directory from a source to a destination. If the source is a
 * file and the destination is a file that already exists, it will be overwritten.
 * If the source is a directory and the destination is a directory, it needs to be empty.
 *
 * Note: This method may not work when moving files between different mount points
 * or file systems, as the underlying `fsPromises.rename` method may not support it.
 *
 * @param source The path to the source file or directory.
 * @param destination The path to the destination file or directory.
 * @throws FileNotFoundError if the source path or the destination path doesn't exist.
 * @throws DirectoryNotEmptyError if the source path is a directory and the destination
 * path is a directory that is not empty.
 * @throws FileSystemAccessError for any other error.
 */
export async function move(source: string, destination: string): Promise<void> {
  try {
    await fsPromises.rename(source, destination);
  } catch (e) {
    ensureNodeErrnoExceptionError(e);
    if (e.code === "ENOENT") {
      if (!(await exists(source))) {
        throw new FileNotFoundError(source, e);
      }
      if (!(await exists(path.dirname(destination)))) {
        throw new FileNotFoundError(destination, e);
      }
    }

    // On linux, trying to move a non-empty directory will throw ENOTEMPTY,
    // while on Windows it will throw EPERM.
    if (e.code === "ENOTEMPTY" || e.code === "EPERM") {
      if (await isDirectory(source)) {
        throw new DirectoryNotEmptyError(destination, e);
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
      retryDelay: 300,
    });
  } catch (e) {
    ensureNodeErrnoExceptionError(e);
    throw new FileSystemAccessError(e.message, e);
  }
}

/**
 * Changes the permissions of a file or directory.
 *
 * @param absolutePath The path to the file or directory.
 * @param mode The permissions to set. It can be a string or a number representing the octal mode.
 * @throws FileNotFoundError if the path doesn't exist.
 * @throws FileSystemAccessError for any other error.
 */
export async function chmod(
  absolutePath: string,
  mode: string | number,
): Promise<void> {
  try {
    await fsPromises.chmod(absolutePath, mode);
  } catch (e) {
    ensureNodeErrnoExceptionError(e);
    if (e.code === "ENOENT") {
      throw new FileNotFoundError(absolutePath, e);
    }

    throw new FileSystemAccessError(e.message, e);
  }
}

/**
 * Creates a file with an empty content. If the file already exists, it will be overwritten.
 * If part of the path doesn't exist, it will be created.
 *
 * @param absolutePath The path to the file to create.
 * @throws FileSystemAccessError for any other error.
 */
export async function createFile(absolutePath: string): Promise<void> {
  await writeUtf8File(absolutePath, "");
}

/**
 * Empties a directory by recursively removing all its content. If the
 * directory doesn't exist, it will be created. The directory itself is
 * not removed.
 *
 * @param absolutePath The path to the directory to empty.
 * @throws NotADirectoryError if the path is not a directory.
 * @throws FileSystemAccessError for any other error.
 */
export async function emptyDir(absolutePath: string): Promise<void> {
  let isDir;
  let mode;
  try {
    const stats = await fsPromises.stat(absolutePath);
    isDir = stats.isDirectory();
    mode = stats.mode;
  } catch (e) {
    ensureNodeErrnoExceptionError(e);
    if (e.code === "ENOENT") {
      await mkdir(absolutePath);
      return;
    }

    throw new FileSystemAccessError(e.message, e);
  }

  if (!isDir) {
    throw new NotADirectoryError(absolutePath, new Error());
  }

  await remove(absolutePath);
  await mkdir(absolutePath);
  // eslint-disable-next-line no-bitwise -- Bitwise is common in fs permissions
  await chmod(absolutePath, mode & 0o777);
}

/**
 * Looks for a file in the current directory and its parents.
 *
 * @param fileName The name of the file to look for.
 * @param from The directory to start the search from. Defaults to the current working directory.
 * @returns The absolute path to the file, or `undefined` if it wasn't found.
 */
export async function findUp(
  fileName: string,
  from?: string,
): Promise<string | undefined> {
  if (from === undefined) {
    from = process.cwd();
  }

  let currentDir = from;
  while (true) {
    const absolutePath = path.join(currentDir, fileName);
    if (await exists(absolutePath)) {
      return absolutePath;
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      return undefined;
    }

    currentDir = parentDir;
  }
}

export {
  FileNotFoundError,
  FileSystemAccessError,
  InvalidFileFormatError,
  JsonSerializationError,
  FileAlreadyExistsError,
  NotADirectoryError,
  IsDirectoryError,
  DirectoryNotEmptyError,
} from "./errors/fs.js";
