import { isAbsolute, resolve } from "node:path";

import { findUp } from "@nomicfoundation/hardhat-utils/fs";

async function findClosestHardhatConfig(): Promise<string> {
  let hardhatConfigPath = await findUp("hardhat.config.js");

  if (hardhatConfigPath !== undefined) {
    return hardhatConfigPath;
  }

  hardhatConfigPath = await findUp("hardhat.config.ts");

  if (hardhatConfigPath !== undefined) {
    return hardhatConfigPath;
  }

  throw new Error("No Hardhat config file found");
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
    throw new Error(`Config file ${configPath} not found`);
  }

  const imported = await import(normalizedPath);

  if (!("default" in imported)) {
    throw new Error(`No config exported in ${configPath}`);
  }

  const config = imported.default;

  if (typeof config !== "object" || config === null) {
    throw new Error(`Invalid config exported in ${configPath}`);
  }

  return config;
}
