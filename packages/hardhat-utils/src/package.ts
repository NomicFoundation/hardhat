import path from "node:path";

import { ensureError } from "./errors/catch-utils.js";
import {
  PackageJsonNotFoundError,
  PackageJsonReadError,
} from "./errors/package.js";
import { getFilePath } from "./internal/package.js";
import { findUp, readJsonFile } from "./fs.js";
import { getCurrentStack } from "./stack.js";

/**
 * The structure of a `package.json` file. This is a subset of the actual
 * `package.json` file, if you need to access other fields you add them here.
 */
export interface PackageJson {
  name: string;
  version: string;
  type?: "commonjs" | "module";
  engines: {
    node: string;
  };
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  peerDependencies: Record<string, string>;
  optionalDependencies: Record<string, string>;
}

/**
 * Searches for the nearest `package.json` file, starting from the directory of
 * the provided file path or url string and moving up the directory tree.
 *
 * @param filePathOrUrl The file path or url string from which to start the
 * search. The url must be a file url. This is useful when you want to find
 * the nearest `package.json` file relative to the current module, as you
 * can use `import.meta.url`.
 * @returns The absolute path to the nearest `package.json` file.
 * @throws PackageJsonNotFoundError If no `package.json` file is found.
 */
export async function findClosestPackageJson(
  filePathOrUrl: string,
): Promise<string> {
  const filePath = getFilePath(filePathOrUrl);

  const packageJsonPath = await findUp("package.json", path.dirname(filePath));

  if (packageJsonPath === undefined) {
    throw new PackageJsonNotFoundError(filePathOrUrl);
  }

  return packageJsonPath;
}

/**
 * Reads the nearest `package.json` file, starting from the directory of the
 * provided file path or url string and moving up the directory tree.
 *
 * @param filePathOrUrl The file path or url string from which to start the
 * search. The url must be a file url. This is useful when you want to find
 * the nearest `package.json` file relative to the current module, as you
 * can use `import.meta.url`.
 * @returns The contents of the nearest `package.json` file, parsed as a
 * {@link PackageJson} object.
 * @throws PackageJsonNotFoundError If no `package.json` file is found.
 * @throws PackageJsonReadError If the `package.json` file is found but cannot
 * be read.
 */
export async function readClosestPackageJson(
  filePathOrUrl: string,
): Promise<PackageJson> {
  const packageJsonPath = await findClosestPackageJson(filePathOrUrl);
  try {
    return await readJsonFile<PackageJson>(packageJsonPath);
  } catch (e) {
    ensureError(e);
    throw new PackageJsonReadError(packageJsonPath, e);
  }
}

/**
 * Finds the root directory of the nearest package, starting from the directory
 * of the provided file path or url string and moving up the directory tree.
 *
 * This function uses `findClosestPackageJson` to find the nearest `package.json`
 * file and then returns the directory that contains that file.
 *
 * @param filePathOrUrl The file path or url string from which to start the
 * search. The url must be a file url. This is useful when you want to find
 * the nearest `package.json` file relative to the current module, as you
 * can use `import.meta.url`.
 * @returns The absolute path of the root directory of the nearest package.
 */
export async function findClosestPackageRoot(
  filePathOrUrl: string,
): Promise<string> {
  const packageJsonPath = await findClosestPackageJson(filePathOrUrl);

  return path.dirname(packageJsonPath);
}

/**
 * Retrieves the name of the nearest package that differs from the package
 * containing the specified module.
 *
 * This function gets the current call stack and iterates over it from top
 * to bottom, looking for the first call site that is in a different package
 * than the current one. It then reads the `package.json` file of that package
 * and returns its name.
 *
 * @param filePathOrUrl The file path or url string of a module contained in
 * the package for which to find the nearest caller's package. The package
 * containing this module is not considered.
 * The url must be a file url. This is useful when you want to find
 * the nearest `package.json` file relative to the current module, as you
 * can use `import.meta.url`.
 * @returns The name of the closest caller's package, or `undefined` if no such
 * caller is found or if an error occurs while reading the
 * `package.json` file.
 * @throws PackageJsonNotFoundError If the `package.json` file of closest to
 * filePathOrUrl is not found.
 */
export async function getClosestCallerPackageName(
  filePathOrUrl: string,
): Promise<string | undefined> {
  const currentPackage = await findClosestPackageJson(filePathOrUrl);

  const stack = getCurrentStack();
  for (const callSite of stack) {
    const fileName = callSite.getFileName() ?? "";
    // Seems like fileName can be a url, so we need to use getFilePath
    if (path.isAbsolute(getFilePath(fileName))) {
      let callerPackage: string;
      try {
        callerPackage = await findClosestPackageJson(fileName);
      } catch {
        return undefined;
      }

      if (callerPackage !== currentPackage) {
        let packageJson;
        try {
          packageJson = await readJsonFile<PackageJson>(callerPackage);
        } catch {
          return undefined;
        }

        return packageJson.name;
      }
    }
  }

  return undefined;
}
