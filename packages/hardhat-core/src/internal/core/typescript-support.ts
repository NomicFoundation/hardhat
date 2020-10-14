import chalk from "chalk";

import { isRunningTests } from "./execution-mode";

let cachedIsTypescriptSupported: boolean | undefined;

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

export function loadTsNodeIfPresent() {
  if (isTypescriptSupported()) {
    try {
      // If we are running tests we just want to transpile
      if (isRunningTests()) {
        // tslint:disable-next-line no-implicit-dependencies
        require("ts-node/register/transpile-only");
      } else {
        // See: https://github.com/nomiclabs/hardhat/issues/265
        if (process.env.TS_NODE_FILES === undefined) {
          process.env.TS_NODE_FILES = "true";
        }

        // tslint:disable-next-line no-implicit-dependencies
        require("ts-node/register");
      }
    } catch (error) {
      // See: https://github.com/nomiclabs/hardhat/issues/274
      if (error.message.includes("Cannot find module 'typescript'")) {
        console.warn(
          chalk.yellow(
            "Failed to load TypeScript support. Please update ts-node."
          )
        );

        return;
      }

      // tslint:disable-next-line only-hardhat-error
      throw error;
    }
  }
}
