import type { HardhatPlugin } from "../../../types/plugins.js";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { ensureError } from "@nomicfoundation/hardhat-utils/error";

import { detectPluginNpmDependencyProblems } from "./detect-plugin-npm-dependency-problems.js";

/**
 * Resolves the plugin list, returning them in the right order.
 */
export async function resolvePluginList(
  projectRoot: string,
  userConfigPluginList: HardhatPlugin[] = [],
): Promise<HardhatPlugin[]> {
  return reverseTopologicalSort(projectRoot, userConfigPluginList);
}

/**
 * Returns an array of reverse topological order of the plugins and their dependencies.
 *
 * If two plugins have no order between them, their relative order should be that of the input array.
 *
 * @param plugins The plugins.
 * @returns The ordered plugins.
 */
async function reverseTopologicalSort(
  projectRoot: string,
  plugins: HardhatPlugin[],
): Promise<HardhatPlugin[]> {
  const visitedPlugins: Map<string, HardhatPlugin> = new Map();
  const resolvedPlugins: HardhatPlugin[] = [];

  async function dfs(plugin: HardhatPlugin) {
    const visited = visitedPlugins.get(plugin.id);

    if (visited !== undefined) {
      if (visited !== plugin) {
        throw new HardhatError(
          HardhatError.ERRORS.CORE.GENERAL.DUPLICATED_PLUGIN_ID,
          { id: plugin.id },
        );
      }

      return;
    }

    visitedPlugins.set(plugin.id, plugin);

    if (plugin.dependencies !== undefined) {
      let dependencyModules: Array<{ default: HardhatPlugin }>;

      try {
        dependencyModules = await Promise.all(plugin.dependencies());
      } catch (error) {
        ensureError(error);
        await detectPluginNpmDependencyProblems(projectRoot, plugin, error);

        throw new HardhatError(
          HardhatError.ERRORS.CORE.PLUGINS.PLUGIN_DEPENDENCY_FAILED_LOAD,
          {
            pluginId: plugin.id,
          },
          error,
        );
      }

      for (const dependencyModule of dependencyModules) {
        await dfs(dependencyModule.default);
      }
    }

    resolvedPlugins.push(plugin);
  }

  for (const plugin of plugins) {
    await dfs(plugin);
  }

  // Resolve conditional dependencies iteratively
  let lastResolvedCount = -1;

  while (resolvedPlugins.length !== lastResolvedCount) {
    lastResolvedCount = resolvedPlugins.length;

    for (const plugin of resolvedPlugins) {
      if (plugin.conditionalDependencies === undefined) {
        continue;
      }

      for (const conditionalDependency of plugin.conditionalDependencies) {
        // Check all condition plugins are installed
        let conditionModules;
        try {
          conditionModules = await Promise.all(
            conditionalDependency.condition(),
          );
        } catch (_error) {
          continue;
        }

        // Check all condition plugins are loaded
        if (
          conditionModules.some(
            (conditionPlugin) =>
              !resolvedPlugins.includes(conditionPlugin.default),
          )
        ) {
          continue;
        }

        // Load the conditional dependency
        let pluginModule;
        try {
          pluginModule = await conditionalDependency.plugin();
        } catch (error) {
          ensureError(error);
          await detectPluginNpmDependencyProblems(projectRoot, plugin, error);

          throw new HardhatError(
            HardhatError.ERRORS.CORE.PLUGINS.PLUGIN_DEPENDENCY_FAILED_LOAD,
            {
              pluginId: plugin.id,
            },
            error,
          );
        }

        await dfs(pluginModule.default);
      }
    }
  }

  return resolvedPlugins;
}
