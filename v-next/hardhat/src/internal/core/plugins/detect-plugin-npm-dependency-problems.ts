import type { HardhatPlugin } from "../../../types/plugins.js";

import path from "node:path";

import { HardhatError } from "@ignored/hardhat-vnext-errors";
import { readJsonFile } from "@ignored/hardhat-vnext-utils/fs";
import {
  findDependencyPackageJson,
  type PackageJson,
} from "@ignored/hardhat-vnext-utils/package";

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

  const pluginPackageJsonPath = await findDependencyPackageJson(
    basePathForNpmResolution,
    plugin.npmPackage,
  );

  if (pluginPackageJsonPath === undefined) {
    throw new HardhatError(HardhatError.ERRORS.PLUGINS.PLUGIN_NOT_INSTALLED, {
      pluginId: plugin.id,
    });
  }

  const pluginPackageJson = await readJsonFile<PackageJson>(
    pluginPackageJsonPath,
  );

  if (pluginPackageJson.peerDependencies === undefined) {
    return;
  }

  const pluginPackagePath = path.dirname(pluginPackageJsonPath);

  for (const [dependencyName, versionSpec] of Object.entries(
    pluginPackageJson.peerDependencies,
  )) {
    const dependencyPackageJsonPath = await findDependencyPackageJson(
      pluginPackagePath,
      dependencyName,
    );

    if (dependencyPackageJsonPath === undefined) {
      throw new HardhatError(
        HardhatError.ERRORS.PLUGINS.PLUGIN_MISSING_DEPENDENCY,
        {
          pluginId: plugin.id,
          peerDependencyName: dependencyName,
        },
      );
    }

    const dependencyPackageJson = await readJsonFile<PackageJson>(
      dependencyPackageJsonPath,
    );

    const installedVersion = dependencyPackageJson.version;

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
