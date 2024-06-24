import type { HardhatPlugin } from "../../types/plugins.js";
import type { PackageJson } from "@ignored/hardhat-vnext-utils/package";

import { createRequire } from "node:module";
import path from "node:path";

import { HardhatError } from "@ignored/hardhat-vnext-errors";
import semver from "semver";

/**
 * Validate that a plugin is installed and that its peer dependencies are installed and satisfy the version constraints.
 *
 * @param plugin - the plugin to be validated
 * @param basePathForNpmResolution - the directory path to use for node module resolution, defaulting to `process.cwd()`
 * @throws {HardhatError} with descriptor:
 * - {@link HardhatError.ERRORS.PLUGINS.PLUGIN_NOT_INSTALLED} if the plugin is not installed as an npm package
 * - {@link HardhatError.ERRORS.PLUGINS.PLUGIN_MISSING_DEPENDENCY} if the plugin's package peer dependency is not installed
 * - {@link HardhatError.ERRORS.PLUGINS.DEPENDENCY_VERSION_MISMATCH} if the plugin's package peer dependency is installed but has the wrong version
 */
export async function detectPluginNpmDependencyProblems(
  plugin: HardhatPlugin,
  basePathForNpmResolution: string = process.cwd(),
): Promise<void> {
  if (plugin.npmPackage === undefined) {
    return;
  }

  const pluginPackageResult = readPackageJsonViaNodeRequire(
    plugin.npmPackage,
    basePathForNpmResolution,
  );

  if (pluginPackageResult === undefined) {
    throw new HardhatError(HardhatError.ERRORS.PLUGINS.PLUGIN_NOT_INSTALLED, {
      pluginId: plugin.id,
    });
  }

  const { packageJson: pluginPackageJson, packagePath } = pluginPackageResult;

  if (pluginPackageJson.peerDependencies === undefined) {
    return;
  }

  for (const [dependencyName, versionSpec] of Object.entries(
    pluginPackageJson.peerDependencies,
  )) {
    const dependencyPackageJsonResult = readPackageJsonViaNodeRequire(
      dependencyName,
      packagePath,
    );

    if (dependencyPackageJsonResult === undefined) {
      throw new HardhatError(
        HardhatError.ERRORS.PLUGINS.PLUGIN_MISSING_DEPENDENCY,
        {
          pluginId: plugin.id,
          peerDependencyName: dependencyName,
        },
      );
    }

    const installedVersion = dependencyPackageJsonResult.packageJson.version;

    if (!semver.satisfies(installedVersion, versionSpec)) {
      throw new HardhatError(
        HardhatError.ERRORS.PLUGINS.DEPENDENCY_VERSION_MISMATCH,
        {
          pluginId: plugin.id,
          peerDependencyName: dependencyName,
          installedVersion,
          expectedVersion: versionSpec,
        },
      );
    }
  }
}

/**
 * Read the package.json of a named package resolved through the node
 * require system.
 *
 * @param packageName - the package name i.e. "@nomiclabs/hardhat-waffle"
 * @param baseRequirePath - the directory path to use for resolution, defaults to `process.cwd()`
 * @returns the package.json object or undefined if the package is not found
 */
function readPackageJsonViaNodeRequire(
  packageName: string,
  baseRequirePath: string,
): { packageJson: PackageJson; packagePath: string } | undefined {
  try {
    const require = createRequire(baseRequirePath);

    const packagePath = require.resolve(path.join(packageName, "package.json"));

    const packageJson = require(packagePath);

    return { packageJson, packagePath };
  } catch (error) {
    return undefined;
  }
}
