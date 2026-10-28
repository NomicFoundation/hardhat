import path from "node:path";

import { exists } from "@nomicfoundation/hardhat-utils/fs";

import { getErrorChain } from "../telemetry/error-classification/helpers.js";

/**
 * The message of the `ERR_MODULE_NOT_FOUND` error that Node.js throws when an
 * ESM import can't be resolved to a file.
 */
const MODULE_NOT_FOUND_REGEX = /^Cannot find module '(.+)' imported from (.+)$/;

export interface MissingTsExtensionFailure {
  /** The `.js` file that couldn't be found. */
  importPath: string;
  /** The file that imports it. */
  importerPath: string;
  /** The `.ts` file with the same name, which exists. */
  suggestedPath: string;
}

/**
 * Detect whether a given error was caused by importing a TypeScript file with
 * a `.js` extension.
 *
 * tsx resolves `./x.js` to `./x.ts`, but Node.js doesn't, so running TypeScript
 * with Node.js's type stripping fails with an `ERR_MODULE_NOT_FOUND` that
 * doesn't mention the TypeScript file.
 *
 * Files in `node_modules` are ignored, as Node.js doesn't strip types there,
 * so using the `.ts` extension wouldn't fix the import.
 */
export async function detectMissingTsExtension(
  error: Error,
): Promise<MissingTsExtensionFailure | undefined> {
  for (const chainedError of getErrorChain(error)) {
    if (
      !("code" in chainedError) ||
      chainedError.code !== "ERR_MODULE_NOT_FOUND"
    ) {
      continue;
    }

    const match = MODULE_NOT_FOUND_REGEX.exec(chainedError.message);

    if (match === null) {
      continue;
    }

    const [, importPath, importerPath] = match;

    if (
      path.extname(importPath) !== ".js" ||
      isInNodeModules(importPath) ||
      isInNodeModules(importerPath)
    ) {
      continue;
    }

    const suggestedPath = `${importPath.slice(0, -".js".length)}.ts`;

    if (!(await exists(suggestedPath))) {
      continue;
    }

    return { importPath, importerPath, suggestedPath };
  }

  return undefined;
}

function isInNodeModules(filePath: string): boolean {
  return filePath.split(/[\\/]/).includes("node_modules");
}
