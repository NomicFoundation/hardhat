import type { HardhatPlugin } from "../../../types/plugins.js";

import path from "node:path";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { readJsonFile } from "@nomicfoundation/hardhat-utils/fs";
import {
  findDependencyPackageJson,
  type PackageJson,
} from "@nomicfoundation/hardhat-utils/package";

/**
 * Validate that a plugin is installed and that its peer dependencies are
 * installed and satisfy the version constraints.
 *
 * @param basePathForNpmResolution the dir path for node module resolution
 * @param plugin the plugin to be validated
 * @throws {HardhatError} with descriptor:
 * - {@link HardhatError.ERRORS.CORE.PLUGINS.PLUGIN_NOT_INSTALLED} if the plugin is
 * not installed as an npm package
 * - {@link HardhatError.ERRORS.CORE.PLUGINS.PLUGIN_MISSING_DEPENDENCY} if the
 * plugin package's peer dependency is not installed
 * - {@link HardhatError.ERRORS.CORE.PLUGINS.DEPENDENCY_VERSION_MISMATCH} if the
 * plugin package's peer dependency is installed but has the wrong version
 */
export async function detectPluginNpmDependencyProblems(
  basePathForNpmResolution: string,
  plugin: HardhatPlugin,
): Promise<void> {
  if (plugin.npmPackage === null) {
    return;
  }

  const pluginPackageJsonPath = await findDependencyPackageJson(
    basePathForNpmResolution,
    // When npmPackage is undefined, we use the id as the package name instead
    plugin.npmPackage ?? plugin.id,
  );

  if (pluginPackageJsonPath === undefined) {
    throw new HardhatError(
      HardhatError.ERRORS.CORE.PLUGINS.PLUGIN_NOT_INSTALLED,
      {
        pluginId: plugin.id,
      },
    );
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
        HardhatError.ERRORS.CORE.PLUGINS.PLUGIN_MISSING_DEPENDENCY,
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

    if (!satisfies(installedVersion, versionSpec.replace("workspace:", ""))) {
      throw new HardhatError(
        HardhatError.ERRORS.CORE.PLUGINS.DEPENDENCY_VERSION_MISMATCH,
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
