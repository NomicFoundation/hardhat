export type * from "./internal/core/config.js";
export * from "./internal/core/config.js";

export type { HardhatUserConfig } from "./types/config.js";

// NOTE: We import the builtin plugins in this module, so that their
// type-extensions are loaded when the user imports `hardhat/config`.
import "./internal/builtin-plugins/index.js";
import type { HardhatUserConfig } from "./types/config.js";

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
