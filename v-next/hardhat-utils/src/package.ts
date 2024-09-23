import path from "node:path";

import { ensureError } from "./error.js";
import {
  PackageJsonNotFoundError,
  PackageJsonReadError,
} from "./errors/package.js";
import { findUp, readJsonFile } from "./fs.js";
import { getFilePath } from "./internal/package.js";

/**
 * The structure of a `package.json` file. This is a subset of the actual
 * `package.json` file, if you need to access other fields you add them here.
 */
export interface PackageJson {
  name: string;
  version: string;
  description?: string;
  type?: "commonjs" | "module";
  engines?: {
    node: string;
  };
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
}

/**
 * Searches for the nearest `package.json` file, starting from the directory of
 * the provided file path or url string and moving up the directory tree.
 *
 * @param pathOrUrl A path or url string from which to start the search. The url
 * must be a file url. This is useful when you want to find the nearest
 * `package.json` file relative to the current module, as you can use
 * `import.meta.url`.
 * @returns The absolute path to the nearest `package.json` file.
 * @throws PackageJsonNotFoundError If no `package.json` file is found.
 */
export async function findClosestPackageJson(
  pathOrUrl: string,
): Promise<string> {
  const filePath = getFilePath(pathOrUrl);

  if (filePath === undefined) {
    throw new PackageJsonNotFoundError(pathOrUrl);
  }

  const packageJsonPath = await findUp("package.json", filePath);

  if (packageJsonPath === undefined) {
    throw new PackageJsonNotFoundError(pathOrUrl);
  }

  return packageJsonPath;
}

/**
 * Reads the nearest `package.json` file, starting from provided path or url
 * string and moving up the directory tree.
 *
 * @param pathOrUrl A path or url string from which to start the search. The url
 * must be a file url. This is useful when you want to find the nearest
 * `package.json` file relative to the current module, as you can use
 * `import.meta.url`.
 * @returns The contents of the nearest `package.json` file, parsed as a
 * {@link PackageJson} object.
 * @throws PackageJsonNotFoundError If no `package.json` file is found.
 * @throws PackageJsonReadError If the `package.json` file is found but cannot
 * be read.
 */
export async function readClosestPackageJson(
  pathOrUrl: string,
): Promise<PackageJson> {
  const packageJsonPath = await findClosestPackageJson(pathOrUrl);
  try {
    return await readJsonFile<PackageJson>(packageJsonPath);
  } catch (e) {
    ensureError(e);
    throw new PackageJsonReadError(packageJsonPath, e);
  }
}

/**
 * Finds the root directory of the nearest package, starting from the provided
 * path or url string and moving up the directory tree.
 *
 * This function uses `findClosestPackageJson` to find the nearest `package.json`
 * file and then returns the directory that contains that file.
 *
 * @param pathOrUrl A path or url string from which to start the search. The url
 * must be a file url. This is useful when you want to find the nearest
 * `package.json` file relative to the current module, as you can use
 * `import.meta.url`.
 * @returns The absolute path of the root directory of the nearest package.
 */
export async function findClosestPackageRoot(
  filePathOrUrl: string,
): Promise<string> {
  const packageJsonPath = await findClosestPackageJson(filePathOrUrl);

  return path.dirname(packageJsonPath);
}

export {
  PackageJsonNotFoundError,
  PackageJsonReadError,
} from "./errors/package.js";
