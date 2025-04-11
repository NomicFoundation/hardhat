import type { HardhatUserConfig } from "../types/config.js";

import { fileURLToPath, pathToFileURL } from "node:url";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { ensureError } from "@nomicfoundation/hardhat-utils/error";
import { exists, findUp, getRealPath } from "@nomicfoundation/hardhat-utils/fs";
import { isObject } from "@nomicfoundation/hardhat-utils/lang";
import { resolveFromRoot } from "@nomicfoundation/hardhat-utils/path";
import debug from "debug";

const log = debug("hardhat:core:config-loading");

/**
 * This cache stores any `.ts` files compiled using `tsImport`.
 * Since this method does not cache compiled files by default, we implement our own caching mechanism.
 */
const compiledConfigFile = new Map<string, any>();

/**
 * Resolves the path to the Hardhat config file using these rules:
 *  - If the user provided a path, that path is returned.
 *  - Otherwise, if the HARDHAT_CONFIG env var is set, that path is returned.
 *  - Otherwise, the closest Hardhat config file to the current working
 *    directory is returned.
 *
 * @param userProvidedPath An optional path to the Hardhat config file, provided
 * by the user.
 * @returns The path to the Hardhat config file, as an absolute path.
 * @throws HardhatError If no Hardhat config file can be found.
 */
export async function resolveHardhatConfigPath(
  userProvidedPath?: string,
): Promise<string> {
  const configPath = userProvidedPath ?? process.env.HARDHAT_CONFIG;

  if (configPath !== undefined) {
    return normalizeConfigPath(configPath);
  }

  if (process.env.HARDHAT_CONFIG !== undefined) {
    log("Using config file path from the HARDHAT_CONFIG env var");
    return normalizeConfigPath(process.env.HARDHAT_CONFIG);
  }

  return findClosestHardhatConfig();
}

/**
 * Finds the closest Hardhat config file to the current working directory.
 *
 * @returns The absolute path to the closest Hardhat config file.
 * @throw HardhatError if no Hardhat config file can be found.
 */
export async function findClosestHardhatConfig(from?: string): Promise<string> {
  let hardhatConfigPath = await findUp("hardhat.config.ts", from);

  if (hardhatConfigPath !== undefined) {
    return hardhatConfigPath;
  }

  hardhatConfigPath = await findUp("hardhat.config.js", from);

  if (hardhatConfigPath !== undefined) {
    return hardhatConfigPath;
  }

  throw new HardhatError(HardhatError.ERRORS.CORE.GENERAL.NO_CONFIG_FILE_FOUND);
}

/**
 * Imports the user config and returns it.
 * @param configPath The path to the config file.
 * @returns The user config.
 */
export async function importUserConfig(
  configPath: string,
): Promise<HardhatUserConfig> {
  const normalizedPath = await normalizeConfigPath(configPath);

  const imported = await importConfigFileWithTsxFallback(
    pathToFileURL(normalizedPath).href,
  );

  if (!("default" in imported)) {
    throw new HardhatError(
      HardhatError.ERRORS.CORE.GENERAL.NO_CONFIG_EXPORTED,
      {
        configPath,
      },
    );
  }

  const config = imported.default;

  if (!isObject(config)) {
    throw new HardhatError(
      HardhatError.ERRORS.CORE.GENERAL.INVALID_CONFIG_OBJECT,
      {
        configPath,
      },
    );
  }

  return config;
}

/**
 * Returns an absolute version of the config path, throwing if the path
 * doesn't exist.
 *
 * @param configPath The path to the config file.
 * @returns The absolute path to the config file.
 * @throws HardhatError if the path doesn't exist.
 */
async function normalizeConfigPath(configPath: string): Promise<string> {
  const normalizedPath = resolveFromRoot(process.cwd(), configPath);

  if (!(await exists(normalizedPath))) {
    throw new HardhatError(
      HardhatError.ERRORS.CORE.GENERAL.INVALID_CONFIG_PATH,
      {
        configPath,
      },
    );
  }

  return normalizedPath;
}

/**
 * Handles the runtime import of ".ts" files. This is necessary in situations such as plain
 * Node.js, where files are expected to be compiled before execution, or when using tools
 * like "vitest", which support TypeScript only when importing from local/user files (i.e.
 * not from the "node_modules" folder).
 *
 * If a ".ts" file is loaded at runtime without prior compilation, it will throw an error.
 * This function compiles any ".ts" file on the fly to prevent such issues.
 *
 * This function uses `tsx`'s `tsImport`, which doesn't cache the compiled files, so we
 * implement our own caching mechanism.
 */
async function importConfigFileWithTsxFallback(configPath: string) {
  try {
    return await import(configPath);
  } catch (error) {
    ensureError(error);

    if (
      "code" in error &&
      error.code === "ERR_UNKNOWN_FILE_EXTENSION" &&
      configPath.endsWith(".ts")
    ) {
      const realPath = await getRealPath(fileURLToPath(configPath));

      if (compiledConfigFile.has(realPath)) {
        return compiledConfigFile.get(realPath);
      }

      const { tsImport } = await import("tsx/esm/api");
      const config = tsImport(configPath, import.meta.url);

      compiledConfigFile.set(realPath, config);

      return config;
    }

    throw error;
  }
}
