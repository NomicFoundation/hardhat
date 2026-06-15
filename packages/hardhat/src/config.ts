export type * from "./internal/core/config.js";
export * from "./internal/core/config.js";

export type { HardhatUserConfig } from "./types/config.js";

import type { HardhatUserConfig } from "./types/config.js";

import { throwUsingHardhat2PluginError } from "./internal/using-hardhat2-plugin-errors.js";

const DEFINE_PLUGIN_MIGRATION_HINT =
  "To migrate a plugin to Hardhat 3, export a plugin object with definePlugin from hardhat/plugins and register hook handlers in its hookHandlers field.";

/**
 * Defines a Hardhat user config.
 *
 * This function is normally expected to be used in your `hardhat.config.ts` file
 * like this:
 *
 * ```js
 * import { defineConfig } from "hardhat/config";
 *
 * export default defineConfig({
 *   // Your config ...
 * });
 * ```
 * @note If using `--isolatedDeclarations`, you should import the type
 * `HardhatUserConfig` from `hardhat/config` instead of relying on the return
 * type of this function.
 *
 * @param config Your config. See {@link https://hardhat.org/config}.
 * @returns The config.
 */
export function defineConfig(config: HardhatUserConfig): HardhatUserConfig {
  // In reality, this function doesn't do anything, it just returns your config.
  // Why does it exist?
  //  - It gives autocomplete of the config both to js and ts users.
  //  - It allows you to define and export the config in a single statement,
  //    having type-safety without much more verbosity.
  //  - While it doesn't do anything, it feels mandatory, so most users will
  //    use it and have a better user experience.
  return config;
}

/**
 * @deprecated This function is part of the Hardhat 2 plugin API.
 */
export function extendConfig(..._args: any): any {
  throwUsingHardhat2PluginError("extendConfig", DEFINE_PLUGIN_MIGRATION_HINT);
}

/**
 * @deprecated This function is part of the Hardhat 2 plugin API.
 */
export function extendEnvironment(..._args: any): any {
  throwUsingHardhat2PluginError(
    "extendEnvironment",
    DEFINE_PLUGIN_MIGRATION_HINT,
  );
}

/**
 * @deprecated This function is part of the Hardhat 2 plugin API.
 */
export function extendProvider(..._args: any): any {
  throwUsingHardhat2PluginError("extendProvider", DEFINE_PLUGIN_MIGRATION_HINT);
}

/**
 * @deprecated This function is part of the Hardhat 2 plugin API.
 */
export function scope(..._args: any): any {
  throwUsingHardhat2PluginError(
    "scope",
    "To migrate tasks to Hardhat 3, define them with task or emptyTask from hardhat/config and include them in a plugin exported with definePlugin from hardhat/plugins.",
  );
}

/**
 * @deprecated This function is part of the Hardhat 2 plugin API.
 */
export function subtask(..._args: any): any {
  throwUsingHardhat2PluginError(
    "subtask",
    "To migrate subtasks to Hardhat 3, define them as nested tasks with task or emptyTask from hardhat/config and include them in a plugin exported with definePlugin from hardhat/plugins.",
  );
}
