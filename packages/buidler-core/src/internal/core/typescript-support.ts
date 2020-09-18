import chalk from "chalk";

import { ExecutionMode, getExecutionMode } from "./execution-mode";

let cachedIsTypescriptSupported: boolean | undefined;

export function isTypescriptSupported() {
  if (cachedIsTypescriptSupported === undefined) {
    const executionMode = getExecutionMode();
    if (executionMode === ExecutionMode.EXECUTION_MODE_GLOBAL_INSTALLATION) {
      cachedIsTypescriptSupported = false;
    } else if (
      executionMode === ExecutionMode.EXECUTION_MODE_LOCAL_INSTALLATION
    ) {
      try {
        // We resolve these from Buidler's installation.
        require.resolve("typescript");
        require.resolve("ts-node");
        cachedIsTypescriptSupported = true;
      } catch {
        cachedIsTypescriptSupported = false;
      }
    } else {
      // We are inside this project (e.g. running tests), or Buidler is
      // linked and we can't get the Buidler project's node_modules, so we
      // return true.
      //
      // This is safe because Buidler will use this project's installation of
      // TypeScript and ts-node. We need them for compilation and testing, so
      // they'll always be installed.
      cachedIsTypescriptSupported = true;
    }
  }

  return cachedIsTypescriptSupported;
}

export function loadTsNodeIfPresent() {
  if (isTypescriptSupported()) {
    // See: https://github.com/nomiclabs/buidler/issues/265
    if (process.env.TS_NODE_FILES === undefined) {
      process.env.TS_NODE_FILES = "true";
    }

    try {
      // tslint:disable-next-line no-implicit-dependencies
      require("ts-node/register");
    } catch (error) {
      // See: https://github.com/nomiclabs/buidler/issues/274
      if (error.message.includes("Cannot find module 'typescript'")) {
        console.warn(
          chalk.yellow(
            "Failed to load TypeScript support. Please update ts-node."
          )
        );

        return;
      }

      // tslint:disable-next-line only-buidler-error
      throw error;
    }
  }
}
