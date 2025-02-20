import type { HardhatUserConfig } from "../types/config.js";

import { pathToFileURL } from "node:url";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { exists, findUp } from "@nomicfoundation/hardhat-utils/fs";
import { isObject } from "@nomicfoundation/hardhat-utils/lang";
import { resolveFromRoot } from "@nomicfoundation/hardhat-utils/path";
import debug from "debug";

const log = debug("hardhat:core:config-loading");

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

  throw new HardhatError(HardhatError.ERRORS.GENERAL.NO_CONFIG_FILE_FOUND);
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

  const imported = await import(pathToFileURL(normalizedPath).href);

  if (!("default" in imported)) {
    throw new HardhatError(HardhatError.ERRORS.GENERAL.NO_CONFIG_EXPORTED, {
      configPath,
    });
  }

  const config = imported.default;

  if (!isObject(config)) {
    throw new HardhatError(HardhatError.ERRORS.GENERAL.INVALID_CONFIG_OBJECT, {
      configPath,
    });
  }

  return config;
}

/**
 * Returns an abolute version of the config path, throwing if the path
 * doesn't exist.
 *
 * @param configPath The path to the config file.
 * @returns The absolute path to the config file.
 * @throws HardhatError if the path doesn't exist.
 */
async function normalizeConfigPath(configPath: string): Promise<string> {
  const normalizedPath = resolveFromRoot(process.cwd(), configPath);

  if (!(await exists(normalizedPath))) {
    throw new HardhatError(HardhatError.ERRORS.GENERAL.INVALID_CONFIG_PATH, {
      configPath,
    });
  }

  return normalizedPath;
}
