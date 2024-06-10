import { isAbsolute, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { findUp } from "@nomicfoundation/hardhat-utils/fs";
import { isObject } from "@nomicfoundation/hardhat-utils/lang";

async function findClosestHardhatConfig(): Promise<string> {
  let hardhatConfigPath = await findUp("hardhat.config.ts");

  if (hardhatConfigPath !== undefined) {
    return hardhatConfigPath;
  }

  hardhatConfigPath = await findUp("hardhat.config.js");

  if (hardhatConfigPath !== undefined) {
    return hardhatConfigPath;
  }

  throw new HardhatError(HardhatError.ERRORS.GENERAL.NO_CONFIG_FILE_FOUND);
}

export async function resolveConfigPath(): Promise<string> {
  const configPath = process.env.HARDHAT_CONFIG;

  if (configPath !== undefined) {
    return configPath;
  }

  return findClosestHardhatConfig();
}

export async function importUserConfig(configPath: string) {
  const normalizedPath = isAbsolute(configPath)
    ? configPath
    : resolve(process.cwd(), configPath);

  const { exists } = await import("@nomicfoundation/hardhat-utils/fs");

  if (!(await exists(normalizedPath))) {
    throw new HardhatError(HardhatError.ERRORS.GENERAL.INVALID_CONFIG_PATH, {
      configPath,
    });
  }

  const imported = await import(pathToFileURL(normalizedPath).href);

  if (!("default" in imported)) {
    throw new HardhatError(HardhatError.ERRORS.GENERAL.NO_CONFIG_EXPORTED, {
      configPath,
    });
  }

  const config = imported.default;

  if (!isObject(config) || config === null) {
    throw new HardhatError(HardhatError.ERRORS.GENERAL.INVALID_CONFIG_OBJECT, {
      configPath,
    });
  }

  return config;
}
