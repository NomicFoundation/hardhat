import { getPackageJsonPath } from "../util/packageInfo";

/**
 * Returns true if Hardhat is installed locally, by looking for it using the
 * node module resolution logic.
 *
 * If a config file is provided, we start looking for it from it. Otherwise,
 * we use the current working directory.
 */
export function isHardhatInstalledLocally(configPath?: string) {
  try {
    const resolvedPackageJson = require.resolve("hardhat/package.json", {
      paths: [configPath ?? process.cwd()],
    });

    const thisPackageJson = getPackageJsonPath();

    return resolvedPackageJson === thisPackageJson;
  } catch (_) {
    return false;
  }
}

/**
 * Checks whether we're using Hardhat in development mode (that is, we're working _on_ Hardhat).
 */
export function isLocalDev(): boolean {
  // TODO: This may give a false positive under yarn PnP
  return isRunningHardhatCoreTests() || !__filename.includes("node_modules");
}

export function isRunningHardhatCoreTests(): boolean {
  return __filename.endsWith(".ts");
}
