import type { UnsafeHardhatRuntimeEnvironmentOptions } from "./types/cli.js";
import type { HardhatUserConfig } from "./types/config.js";
import type { GlobalOptions } from "./types/global-options.js";
import type { HardhatRuntimeEnvironment } from "./types/hre.js";

import { HardhatRuntimeEnvironmentImplementation } from "./internal/hre.js";

/**
 * Creates an instances of the Hardhat Runtime Environment without any of the
 * built-in plugins.
 *
 * To get the built-in plugins, use `createHardhatRuntimeEnvironment` from
 * `hardhat/hre` instead.
 *
 * @param config - The user's Hardhat configuration.
 * @param userProvidedGlobalOptions - The global options provided by the
 *  user.
 * @param unsafeOptions - Options used to bypass some initialization, to avoid
 *  redoing it in the CLI. Should only be used in the official CLI.
 * @returns The Hardhat Runtime Environment.
 */
export async function createBaseHardhatRuntimeEnvironment(
  config: HardhatUserConfig,
  userProvidedGlobalOptions: Partial<GlobalOptions> = {},
  unsafeOptions?: UnsafeHardhatRuntimeEnvironmentOptions,
): Promise<HardhatRuntimeEnvironment> {
  return HardhatRuntimeEnvironmentImplementation.create(
    config,
    userProvidedGlobalOptions,
    unsafeOptions,
  );
}

export { resolvePluginList } from "./internal/plugins/resolve-plugin-list.js";
export { buildGlobalOptionDefinitions } from "./internal/global-options.js";
