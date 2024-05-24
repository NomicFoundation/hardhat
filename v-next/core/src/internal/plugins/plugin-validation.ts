import { createRequire } from "node:module";
import path from "node:path";
import process from "node:process";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { PackageJson } from "@nomicfoundation/hardhat-utils/package";
import semver from "semver";

import { HardhatPlugin } from "../../types/plugins.js";

/**
 * Validate that a plugin is installed and that its peer dependencies are installed and satisfy the version constraints.
 *
 * @param plugin - the plugin to be validated
 * @param basePathForNpmResolution - the directory path to use for node module resolution, defaulting to `process.cwd()`
 */
export async function validatePluginNpmDependencies(
  plugin: HardhatPlugin,
  // TODO: When all loads where based on a hardhat config file
  // on disk we used the config file's directory as the base path
  // We need to decide if the current working directory is the right
  // option for module resolution now
  basePathForNpmResolution?: string,
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
  baseRequirePath?: string,
): { packageJson: PackageJson; packagePath: string } | undefined {
  try {
    const require = createRequire(baseRequirePath ?? process.cwd());

    const packagePath = require.resolve(path.join(packageName, "package.json"));

    const packageJson = require(packagePath);

    return { packageJson, packagePath };
  } catch (error) {
    return undefined;
  }
}
