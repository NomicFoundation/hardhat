// NOTE: We don't use the `semver` package because it's slow to load, and this
// is always run during the initialization of the CLI.

import chalk from "chalk";

const SEMVER_REV_REGEX = /^(\d+)\.(\d+)\.(\d)+$/;

const MIN_SUPPORTED_NODE_VERSION = [22, 10, 0];

function isNodeVersionSupported(): boolean {
  const nodeVersion = process.versions.node;
  const semverMatch = SEMVER_REV_REGEX.exec(nodeVersion);

  if (semverMatch === null) {
    return false;
  }

  const major = parseInt(semverMatch[1], 10);
  const minor = parseInt(semverMatch[2], 10);
  const patch = parseInt(semverMatch[3], 10);

  if (major < MIN_SUPPORTED_NODE_VERSION[0]) {
    return false;
  }

  if (minor < MIN_SUPPORTED_NODE_VERSION[1]) {
    return false;
  }

  if (patch < MIN_SUPPORTED_NODE_VERSION[2]) {
    return false;
  }

  return true;
}

export function printNodeJsVersionWarningIfNecessary(
  print: (message: string) => void,
): void {
  if (isNodeVersionSupported()) {
    return;
  }

  print("");
  print(
    chalk.bold(`${chalk.yellow("WARNING:")} You are using Node.js ${process.versions.node} which is not supported by Hardhat.
Please upgrade to ${MIN_SUPPORTED_NODE_VERSION.join(".")} or a later version.`),
  );
  print("");
}
