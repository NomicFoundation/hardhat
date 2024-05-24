import { HardhatError } from "@nomicfoundation/hardhat-errors";

import { HardhatPlugin } from "../../types/plugins.js";

/**
 * Resolves the plugin list, returning them in the right order.
 */
export async function resolvePluginList(
  userConfigPluginList: HardhatPlugin[] = [],
): Promise<HardhatPlugin[]> {
  return reverseTopologicalSort(userConfigPluginList);
}

/**
 * Returns an array of reverse topological order of the plugins and their dependencies.
 *
 * If two plugins have no order between them, their relative order should be that of the input array.
 *
 * @param plugins The plugins.
 * @returns The ordered plugins.
 */
export async function reverseTopologicalSort(
  plugins: HardhatPlugin[],
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
      for (const dependencyFactory of plugin.dependencies) {
        const dependency = await dependencyFactory();

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
