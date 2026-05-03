import type * as StreamParserJson from "@streamparser/json-node";
import type * as JsonStreamStringify from "json-stream-stringify";
import type { FileHandle } from "node:fs/promises";

import fsPromises from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pipeline } from "node:stream/promises";

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
import {
  isDirectoryDirentAware,
  readdirWithFileTypesOrEmpty,
} from "./internal/fs.js";

// We don't load @streamparser/json-node on startup because it's only
// used by readJsonFileAsStream for very large JSON files.
let streamParserJson: typeof StreamParserJson | undefined;

// We don't load json-stream-stringify on startup because it's only
// used by writeJsonFileAsStream for very large JSON objects.
let jsonStreamStringify: typeof JsonStreamStringify | undefined;

const AMBIGUOUS_CASING_DIR_ENTRY = Symbol("ambiguous");

type CaseFoldedEntry = string | typeof AMBIGUOUS_CASING_DIR_ENTRY;

/**
 * The entries in a directory, which stores their exact name, and also a
 * case-folded mapping to support case-insensitive lookups.
 */
interface DirEntries {
  /**
   * The exact names present in the directory, as returned by `readdir`.
   */
  readonly exactNames: Set<string>;

  /**
   * Case-folded key -> the actual on-disk spelling, or
   * AMBIGUOUS_CASING_DIR_ENTRY when multiple entries in the directory fold to
   * the same key.
   */
  readonly caseFoldedNames: Map<string, CaseFoldedEntry>;
}

/**
 * Resolves paths to their true (on-disk) casing, caching directory listings
 * and resolutions so repeated lookups against the same directories don't re-hit
 * the filesystem.
 *
 * Intended to be used in hot paths where the same `from` directories are seen
 * over and over.
 *
 * Does not resolve symbolic links.
 *
 * This class caches successful resolutions internally, and may do some
 * duplicate work when multiple concurrent lookups for the same path are made
 * before the first one finishes. It does not cache failed resolutions as
 * negative result entries, but it does cache directory listings, so filesystem
 * changes may not be observed until `clear()` is called. After `clear()`,
 * previously cached directory and resolution data is discarded. If profiling
 * shows that this work duplication is a problem, we can either cache in-flight
 * operations, or add a mutex.
 */
export class TrueCasePathResolver {
  /**
   * A cache of DirEntries for the directories we've seen, keyed by their
   * normalized absolute path as read. For example, if the same physical
   * directory is read as `/a/foo` and `/a/Foo`, each path gets its own entry.
   */
  readonly #dirCache = new Map<string, DirEntries>();

  /**
   * A cache of successful resolutions, grouped by their `from` trusted starting
   * directory.
   *
   * The outer key is the normalized absolute `from` path, and the inner key is
   * the normalized `relativePath`.
   *
   * This keeps paths like `/a/B` + `foo.ts` distinct from `/a` + `B/foo.ts`,
   * even if they point to the same location.
   */
  readonly #resultCache = new Map<string, Map<string, string>>();

  /**
   * Determines the true-case path of a given relative path from a specified
   * directory, without resolving symbolic links.
   *
   * Note that the casing of the `from` path is not checked against the
   * filesystem, and is trusted as-is. This avoids unnecessary directory
   * listings for every ancestor of `from`, which can result in permission
   * errors for directories that are otherwise accessible.
   *
   * @param from The absolute path of the directory to start the search from.
   * @param relativePath The relative path to get the true case of.
   * @returns The true case of the relative path. Returns an empty string if
   * relativePath points to from.
   * @throws FileNotFoundError if the starting directory or the relative path
   *  doesn't exist or is ambiguous.
   * @throws NotADirectoryError if the starting directory, or an intermediate
   *  segment, is not a directory.
   * @throws FileSystemAccessError for any other error.
   */
  public async getFileTrueCase(
    from: string,
    relativePath: string,
  ): Promise<string> {
    const absoluteFrom = path.resolve(from);

    if (path.normalize(relativePath) === ".") {
      // There's no casing to resolve, but we still read `from` so that callers
      // get the documented FileNotFoundError / NotADirectoryError if it
      // doesn't exist or isn't a directory.
      await this.#getDirEntries(absoluteFrom);
      return "";
    }

    const resolved = await this.#resolveFrom(absoluteFrom, relativePath);
    const resolvedRelativePath = path.relative(absoluteFrom, resolved);

    if (
      resolvedRelativePath === ".." ||
      resolvedRelativePath.startsWith(`..${path.sep}`) ||
      path.isAbsolute(resolvedRelativePath)
    ) {
      throw new FileNotFoundError(path.resolve(absoluteFrom, relativePath));
    }

    return resolvedRelativePath;
  }

  /**
   * Clears all cached directory listings and resolutions.
   */
  public clear(): void {
    this.#dirCache.clear();
    this.#resultCache.clear();
  }

  async #resolveFrom(from: string, relativePath: string): Promise<string> {
    const fromCacheKey = this.#getResultFromCacheKey(from);
    const relativePathCacheKey =
      this.#getResultRelativePathCacheKey(relativePath);

    const cached = this.#resultCache
      .get(fromCacheKey)
      ?.get(relativePathCacheKey);

    if (cached !== undefined) {
      return cached;
    }

    const resolved = await this.#doResolveFrom(from, relativePath);

    let resultsFromCache = this.#resultCache.get(fromCacheKey);
    if (resultsFromCache === undefined) {
      resultsFromCache = new Map<string, string>();
      this.#resultCache.set(fromCacheKey, resultsFromCache);
    }

    resultsFromCache.set(relativePathCacheKey, resolved);

    return resolved;
  }

  async #doResolveFrom(from: string, relativePath: string): Promise<string> {
    let currentPath = from;

    const segments = path
      .normalize(relativePath)
      .split(path.sep)
      .filter((s) => s.length > 0 || s === ".");

    for (const requestedName of segments) {
      if (requestedName === "..") {
        currentPath = path.join(currentPath, requestedName);
        continue;
      }

      const entries = await this.#getDirEntries(currentPath);
      const actualName = this.#lookupChild(entries, requestedName);

      if (actualName === undefined) {
        throw new FileNotFoundError(path.resolve(from, relativePath));
      }

      currentPath = path.join(currentPath, actualName);
    }

    return currentPath;
  }

  async #getDirEntries(dirPath: string): Promise<DirEntries> {
    const cacheKey = this.#getDirCacheKey(dirPath);
    const cached = this.#dirCache.get(cacheKey);
    if (cached !== undefined) {
      return cached;
    }

    const entries = await this.#readDirEntries(dirPath);
    this.#dirCache.set(cacheKey, entries);

    return entries;
  }

  async #readDirEntries(dirPath: string): Promise<DirEntries> {
    const names = await readdir(dirPath);

    const exactNames = new Set<string>();
    const caseFoldedNames = new Map<string, CaseFoldedEntry>();

    for (const name of names) {
      exactNames.add(name);

      const folded = this.#caseFold(name);
      const previous = caseFoldedNames.get(folded);
      if (previous === undefined) {
        caseFoldedNames.set(folded, name);
      } else if (previous !== name) {
        caseFoldedNames.set(folded, AMBIGUOUS_CASING_DIR_ENTRY);
      }
    }

    return { exactNames, caseFoldedNames };
  }

  #lookupChild(entries: DirEntries, requestedName: string): string | undefined {
    if (entries.exactNames.has(requestedName)) {
      return requestedName;
    }

    const candidate = entries.caseFoldedNames.get(
      this.#caseFold(requestedName),
    );

    if (candidate === undefined || candidate === AMBIGUOUS_CASING_DIR_ENTRY) {
      return undefined;
    }

    return candidate;
  }

  #getResultFromCacheKey(from: string): string {
    return path.normalize(from);
  }

  #getResultRelativePathCacheKey(relativePath: string): string {
    return path.normalize(relativePath);
  }

  #getDirCacheKey(dirPath: string): string {
    return path.normalize(dirPath);
  }

  /**
   * Returns a case-folded version of the given name, which can be thought of as
   * a "normalized uppercase" form. This is used to implement case-insensitive
   * comparisons.
   *
   * This is not an exact match with what every filesystem would do, but a good
   * enough approximation for our purposes.
   *
   * @param name The name to fold.
   * @returns The case-folded version of the name.
   */
  #caseFold(name: string): string {
    return name.normalize("NFC").toUpperCase();
  }
}

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
  matches?: (absolutePathToFile: string) => Promise<boolean> | boolean,
  directoryFilter?: (absolutePathToDir: string) => Promise<boolean> | boolean,
): Promise<string[]> {
  const results: string[] = [];
  await collectAllFilesMatching(dirFrom, results, matches, directoryFilter);

  return results;
}

async function collectAllFilesMatching(
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
 * Recursively searches a directory and its subdirectories for directories that
 * satisfy the specified condition, returning their absolute paths. Once a
 * directory is found, its subdirectories are not searched.
 *
 * Note: dirFrom is never returned, nor is `matches` called on it.
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
  matches?: (absolutePathToDir: string) => Promise<boolean> | boolean,
): Promise<string[]> {
  const results: string[] = [];
  await collectAllDirectoriesMatching(dirFrom, results, matches);

  return results;
}

async function collectAllDirectoriesMatching(
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
 * @deprecated Use {@link TrueCasePathResolver} instead.
 */
export async function getFileTrueCase(
  from: string,
  relativePath: string,
): Promise<string> {
  return await new TrueCasePathResolver().getFileTrueCase(from, relativePath);
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

    if (streamParserJson === undefined) {
      streamParserJson = await import("@streamparser/json-node");
    }

    // NOTE: We set a separator to disable self-closing to be able to use the parser
    // in the stream.pipeline context; see https://github.com/juanjoDiaz/streamparser-json/issues/47
    const jsonParser = new streamParserJson.JSONParser({
      separator: "",
    });

    const result: T | undefined = await pipeline(
      fileReadStream,
      jsonParser,
      async (
        elements: AsyncIterable<StreamParserJson.ParsedElementInfo.ParsedElementInfo>,
      ): Promise<any | undefined> => {
        let value:
          | StreamParserJson.JsonTypes.JsonPrimitive
          | StreamParserJson.JsonTypes.JsonStruct
          | undefined;
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

    if (jsonStreamStringify === undefined) {
      jsonStreamStringify = await import("json-stream-stringify");
    }

    const jsonStream = new jsonStreamStringify.JsonStreamStringify(object);
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
 * Reads a directory and returns its content as an array of strings, returning
 * an empty array if the directory doesn't exist.
 *
 * @param absolutePathToDir The path to the directory.
 * @returns An array of strings with the names of the files and directories in the directory, and an empty array if the directory doesn't exist.
 * @throws NotADirectoryError if the path is not a directory.
 * @throws FileSystemAccessError for any other error.
 */
export async function readdirOrEmpty(
  absolutePathToDir: string,
): Promise<string[]> {
  try {
    return await readdir(absolutePathToDir);
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
    return await getRealPath(
      await fsPromises.mkdtemp(path.join(tmpdir(), prefix)),
    );
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
  // We must proactively check if the source is a directory.
  // On modern Linux kernels (6.x+), the `copy_file_range` system call used by
  // Node.js may return success (0 bytes copied) when the source is a directory
  // instead of throwing EISDIR. Node.js interprets this 0-byte success as a
  // completed operation, resulting in no error being thrown.
  if (await isDirectory(source)) {
    throw new IsDirectoryError(source, undefined);
  }

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

/**
 * This function uses some heuristics to check if a file is binary by reading the first bytesToCheck bytes from the file.
 */
export async function isBinaryFile(
  filePath: string,
  bytesToCheck = 8000,
): Promise<boolean> {
  const fd = await fsPromises.open(filePath, "r");

  const buffer = Buffer.alloc(bytesToCheck);
  const { bytesRead } = await fd.read(buffer, 0, bytesToCheck, 0);
  await fd.close();

  let nonPrintable = 0;
  for (let i = 0; i < bytesRead; i++) {
    const byte = buffer[i];

    // Allow common text ranges: tab, newline, carriage return, and printable ASCII
    if (
      byte === 9 || // tab
      byte === 10 || // newline
      byte === 13 || // carriage return
      (byte >= 32 && byte <= 126)
    ) {
      continue;
    }
    nonPrintable++;
  }

  // Heuristic: if more than ~30% of bytes are non-printable, assume binary
  return nonPrintable / bytesRead > 0.3;
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
