import { HardhatPlugin } from "../../types/plugins.js";

/**
 * Returns an array of reverse topological order of the plugins and their dependencies.
 *
 * If two plugins have no order between them, their relative order should be that of the input array.
 *
 * @param plugins The plugins.
 * @returns The ordered plugins.
 */
export function reverseTopologicalSort(
  plugins: HardhatPlugin[],
): HardhatPlugin[] {
  const visitedPlugins: Map<string, HardhatPlugin> = new Map();
  const result: HardhatPlugin[] = [];

  function dfs(plugin: HardhatPlugin) {
    const visited = visitedPlugins.get(plugin.id);

    if (visited !== undefined) {
      if (visited !== plugin) {
        throw new Error(
          `Duplicated plugin id "${plugin.id}" found. Did you install multiple versions of the same plugin?`,
        );
      }

      return;
    }

    visitedPlugins.set(plugin.id, plugin);

    if (plugin.dependencies !== undefined) {
      for (const dependency of plugin.dependencies) {
        dfs(dependency);
      }
    }

    result.push(plugin);
  }

  for (const plugin of plugins) {
    dfs(plugin);
  }

  return result;
}
