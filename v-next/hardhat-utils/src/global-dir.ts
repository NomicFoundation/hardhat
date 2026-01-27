import { ensureDir } from "./fs.js";
import { generatePaths, HARDHAT_PACKAGE_NAME } from "./internal/global-dir.js";

// Internal override for testing purposes
let _cacheDirOverride: string | undefined;

/**
 * Sets a mock cache directory for getCacheDir. This is intended for testing
 * purposes only, to isolate tests from the real global cache.
 *
 * @param dir The directory path to use as the mock cache directory.
 */
export function setMockCacheDir(dir: string): void {
  _cacheDirOverride = dir;
}

/**
 * Resets the mock cache directory set by setMockCacheDir.
 * Call this in test cleanup to restore normal behavior.
 */
export function resetMockCacheDir(): void {
  _cacheDirOverride = undefined;
}

/**
 * Returns the configuration directory path for a given package (defaults to "hardhat").
 * Ensures that the directory exists before returning the path.
 *
 * @param packageName The name of the package for which to generate paths. Defaults to "hardhat" if no package name is provided.
 * @returns The path to the hardhat configuration directory.
 * @throws FileSystemAccessError for any error.
 */
export async function getConfigDir(
  packageName: string = HARDHAT_PACKAGE_NAME,
): Promise<string> {
  const { config } = await generatePaths(packageName);
  await ensureDir(config);
  return config;
}

/**
 * Returns the cache directory path for a given package (defaults to "hardhat").
 * Ensures that the directory exists before returning the path.
 *
 * For testing purposes, the cache directory can be overridden using
 * setMockCacheDir(). This is intended to isolate tests from the real
 * global cache.
 *
 * @param packageName The name of the package for which to generate paths. Defaults to "hardhat" if no package name is provided.
 * @returns The path to the hardhat cache directory.
 * @throws FileSystemAccessError for any error.
 */
export async function getCacheDir(
  packageName: string = HARDHAT_PACKAGE_NAME,
): Promise<string> {
  // Allow override for testing purposes
  if (_cacheDirOverride !== undefined) {
    await ensureDir(_cacheDirOverride);
    return _cacheDirOverride;
  }

  const { cache } = await generatePaths(packageName);
  await ensureDir(cache);
  return cache;
}

/**
 * Returns the telemetry directory path for a given package (defaults to "hardhat").
 * Ensures that the directory exists before returning the path.
 *
 * @param packageName The name of the package for which to generate paths. Defaults to "hardhat" if no package name is provided.
 * @returns A promise that resolves to the path of the telemetry directory.
 * @throws FileSystemAccessError for any error.
 */
export async function getTelemetryDir(
  packageName: string = HARDHAT_PACKAGE_NAME,
): Promise<string> {
  const { data } = await generatePaths(packageName);
  await ensureDir(data);
  return data;
}
