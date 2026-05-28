import type { HardhatPlugin } from "../../../types/plugins.js";

const loadedPlugins = new Map<string, HardhatPlugin>();

export function registerLoadedPlugin(plugin: HardhatPlugin): void {
  loadedPlugins.set(plugin.id, plugin);
}

export function getLoadedPlugins(): ReadonlyMap<string, HardhatPlugin> {
  return loadedPlugins;
}
