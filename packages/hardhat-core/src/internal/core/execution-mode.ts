/**
 * Returns true if Hardhat is installed locally, by looking for it using the
 * node module resolution logic.
 *
 * If a config file is provided, we start looking for it from it. Otherwise,
 * we use the current working directory.
 */
export function isHardhatInstalledLocally(configPath?: string) {
  try {
    require.resolve("hardhat", { paths: [configPath ?? process.cwd()] });
    return true;
  } catch (_) {
    return false;
  }
}

/**
 * Checks whether we're using Hardhat in development mode (that is, we're working _on_ Hardhat).
 */
export function isLocalDev(): boolean {
  // TODO: This may give a false positive under yarn PnP
  return __filename.endsWith(".ts") || !__filename.includes("node_modules");
}
