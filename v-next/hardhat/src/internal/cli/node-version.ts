// NOTE: We don't use the `semver` package because it's slow to load, and this
// is always run during the initialization of the CLI.

import chalk from "chalk";

export const MIN_SUPPORTED_NODE_VERSION: number[] = [22, 10, 0];

export function isNodeVersionSupported(): boolean {
  try {
    const [majorStr, minorStr, patchStr] = process.versions.node.split(".");
    const major = parseInt(majorStr, 10);
    const minor = parseInt(minorStr, 10);
    const patch = parseInt(patchStr, 10);

    if (major % 2 === 1) {
      return false;
    }

    if (major < MIN_SUPPORTED_NODE_VERSION[0]) {
      return false;
    } else if (major > MIN_SUPPORTED_NODE_VERSION[0]) {
      return true;
    }

    if (minor < MIN_SUPPORTED_NODE_VERSION[1]) {
      return false;
    } else if (minor > MIN_SUPPORTED_NODE_VERSION[1]) {
      return true;
    }

    if (patch < MIN_SUPPORTED_NODE_VERSION[2]) {
      return false;
    }
  } catch {
    // If our parsing of the version fails we assume it's supported.
    return true;
  }

  return true;
}

export function printNodeJsVersionWarningIfNecessary(): void {
  if (!isNodeVersionSupported()) {
    console.log(
      chalk.bold(`\n${chalk.yellow("WARNING:")} You are using Node.js ${process.versions.node} which is not supported by Hardhat.
Please upgrade to ${MIN_SUPPORTED_NODE_VERSION.join(".")} or a later LTS version (even major version number)\n`),
    );
    return;
  }
}
