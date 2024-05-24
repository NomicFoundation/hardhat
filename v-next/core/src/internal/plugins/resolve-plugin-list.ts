import type { HardhatPlugin } from "../../types/plugins.js";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { ensureError } from "@nomicfoundation/hardhat-utils/error";

import { validatePluginNpmDependencies } from "./plugin-validation.js";

/**
 * Resolves the plugin list, returning them in the right order.
 */
export async function resolvePluginList(
  userConfigPluginList: HardhatPlugin[] = [],
  basePathForNpmResolution: string,
): Promise<HardhatPlugin[]> {
  return reverseTopologicalSort(userConfigPluginList, basePathForNpmResolution);
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
  plugins: HardhatPlugin[],
  basePathForNpmResolution: string,
): Promise<HardhatPlugin[]> {
  const visitedPlugins: Map<string, HardhatPlugin> = new Map();
  const result: HardhatPlugin[] = [];

  async function dfs(plugin: HardhatPlugin) {
    const visited = visitedPlugins.get(plugin.id);

    if (visited !== undefined) {
      if (visited !== plugin) {
        throw new HardhatError(
          HardhatError.ERRORS.GENERAL.DUPLICATED_PLUGIN_ID,
          { id: plugin.id },
        );
      }

      return;
    }

    visitedPlugins.set(plugin.id, plugin);

    if (plugin.dependencies !== undefined) {
      for (const loadFn of plugin.dependencies) {
        const dependency = await loadDependency(
          plugin,
          loadFn,
          basePathForNpmResolution,
        );

        await dfs(dependency);
      }
    }

    result.push(plugin);
  }

  for (const plugin of plugins) {
    await dfs(plugin);
  }

  return result;
}

/**
 * Attempt to load a plugins dependency. If there is an error,
 * first try and validate the npm dependencies of the plugin.
 *
 * @param plugin - the plugin has the dependency
 * @param loadFn - the load function for the dependency
 * @param basePathForNpmResolution - the directory path to use for node module resolution
 * @returns the loaded plugin
 */
async function loadDependency(
  plugin: HardhatPlugin,
  loadFn: () => Promise<HardhatPlugin>,
  basePathForNpmResolution: string,
): Promise<HardhatPlugin> {
  try {
    return await loadFn();
  } catch (error) {
    ensureError(error);

    await validatePluginNpmDependencies(plugin, basePathForNpmResolution);

    throw new HardhatError(
      HardhatError.ERRORS.PLUGINS.PLUGIN_DEPENDENCY_FAILED_LOAD,
      {
        pluginId: plugin.id,
      },
      error,
    );
  }
}
