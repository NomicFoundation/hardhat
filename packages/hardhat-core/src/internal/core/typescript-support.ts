import { HardhatConfig } from "../../types";

import { resolveConfigPath } from "./config/config-loading";
import { HardhatError } from "./errors";
import { ERRORS } from "./errors-list";
import { isRunningHardhatCoreTests } from "./execution-mode";

let cachedIsTypescriptSupported: boolean | undefined;

/**
 * Returns true if Hardhat will run in using typescript mode.
 * @param configPath The config path if provider by the user.
 */
export function willRunWithTypescript(configPath?: string): boolean {
  const config = resolveConfigPath(configPath);
  return isTypescriptFile(config);
}

/**
 * Returns true if an Hardhat is already running with typescript.
 */
export function isRunningWithTypescript(config: HardhatConfig): boolean {
  return isTypescriptFile(config.paths.configFile);
}

export function isTypescriptSupported() {
  if (cachedIsTypescriptSupported === undefined) {
    try {
      // We resolve these from Hardhat's installation.
      require.resolve("typescript");
      require.resolve("ts-node");
      cachedIsTypescriptSupported = true;
    } catch {
      cachedIsTypescriptSupported = false;
    }
  }

  return cachedIsTypescriptSupported;
}

export function loadTsNode() {
  try {
    require.resolve("typescript");
  } catch (error) {
    throw new HardhatError(ERRORS.GENERAL.TYPESCRIPT_NOT_INSTALLED);
  }

  try {
    require.resolve("ts-node");
  } catch (error) {
    throw new HardhatError(ERRORS.GENERAL.TS_NODE_NOT_INSTALLED);
  }

  // If we are running tests we just want to transpile
  if (isRunningHardhatCoreTests()) {
    // tslint:disable-next-line no-implicit-dependencies
    require("ts-node/register/transpile-only");
    return;
  }

  // See: https://github.com/nomiclabs/hardhat/issues/265
  if (process.env.TS_NODE_FILES === undefined) {
    process.env.TS_NODE_FILES = "true";
  }

  // tslint:disable-next-line no-implicit-dependencies
  require("ts-node/register");
}

function isTypescriptFile(path: string): boolean {
  return path.endsWith(".ts");
}
