export { HardhatPluginError } from "@nomicfoundation/hardhat-errors";

import type { HardhatPlugin } from "./types/plugins.js";

import { registerLoadedPlugin } from "./internal/core/plugins/loaded-plugins-registry.js";
import { throwUsingHardhat2PluginError } from "./internal/using-hardhat2-plugin-errors.js";

/**
 * Defines a Hardhat plugin.
 *
 * Plugin authors should use this helper as the default export of their
 * plugin's `index` module. It registers the plugin's `id` in a process-wide
 * registry of loaded plugins, which the Hardhat CLI uses to detect plugins
 * that are imported but not included in the user's `plugins` array.
 *
 * @param plugin The plugin definition.
 * @returns The same plugin definition, unchanged.
 */
export function definePlugin(plugin: HardhatPlugin): HardhatPlugin {
  registerLoadedPlugin(plugin);
  return plugin;
}

/**
 * @deprecated This function is part of the Hardhat 2 plugin API.
 */
export function lazyFunction(..._args: any): any {
  throwUsingHardhat2PluginError();
}

/**
 * @deprecated This function is part of the Hardhat 2 plugin API.
 */
export function lazyObject(..._args: any): any {
  throwUsingHardhat2PluginError();
}
