import type { HardhatPlugin } from "../../../types/plugins.js";
import type { PackageJson } from "@ignored/hardhat-vnext-utils/package";

import { createRequire } from "node:module";
import path from "node:path";

import { HardhatError } from "@ignored/hardhat-vnext-errors";

/**
 * Validate that a plugin is installed and that its peer dependencies are
 * installed and satisfy the version constraints.
 *
 * @param basePathForNpmResolution the dir path for node module resolution
 * @param plugin the plugin to be validated
 * @throws {HardhatError} with descriptor:
 * - {@link HardhatError.ERRORS.PLUGINS.PLUGIN_NOT_INSTALLED} if the plugin is
 * not installed as an npm package
 * - {@link HardhatError.ERRORS.PLUGINS.PLUGIN_MISSING_DEPENDENCY} if the
 * plugin's package peer dependency is not installed
 * - {@link HardhatError.ERRORS.PLUGINS.DEPENDENCY_VERSION_MISMATCH} if the
 * plugin's package peer dependency is installed but has the wrong version
 */
export async function detectPluginNpmDependencyProblems(
  basePathForNpmResolution: string,
  plugin: HardhatPlugin,
): Promise<void> {
  if (plugin.npmPackage === undefined) {
    return;
  }

  // Ensure trailing slash, otherwise createRequire won't work properly
  const normalizedBasePath = basePathForNpmResolution.endsWith("/")
    ? basePathForNpmResolution
    : `${basePathForNpmResolution}/`;

  const pluginPackageResult = readPackageJsonViaNodeRequire(
    normalizedBasePath,
    plugin.npmPackage,
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
      packagePath,
      dependencyName,
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

    const { satisfies } = await import("semver");

    if (!satisfies(installedVersion, versionSpec)) {
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
 * Read the package.json of a named package resolved through the node require
 * system.
 *
 * @param packageName the package name i.e. "@nomiclabs/hardhat-waffle"
 * @param baseRequirePath  the dir path for node module resolution
 * @returns the package.json object or undefined if the package is not found
 */
function readPackageJsonViaNodeRequire(
  baseRequirePath: string,
  packageName: string,
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
