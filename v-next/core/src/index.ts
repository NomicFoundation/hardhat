import type { UnsafeHardhatRuntimeEnvironmentOptions } from "./types/cli.js";
import type { HardhatUserConfig } from "./types/config.js";
import type { GlobalArguments } from "./types/global-parameters.js";
import type { HardhatRuntimeEnvironment } from "./types/hre.js";

import { HardhatRuntimeEnvironmentImplementation } from "./internal/hre.js";

/**
 * Creates an instances of the Hardhat Runtime Environment.
 *
 * @param config - The user's Hardhat configuration.
 * @param userProvidedGlobalArguments - The global arguments provided by the
 *  user.
 * @param unsafeOptions - Options used to bypass some initialization, to avoid
 *  redoing it in the CLI. Should only be used in the official CLI.
 * @returns The Hardhat Runtime Environment.
 */
export async function createHardhatRuntimeEnvironment(
  config: HardhatUserConfig,
  userProvidedGlobalArguments: Partial<GlobalArguments> = {},
  unsafeOptions?: UnsafeHardhatRuntimeEnvironmentOptions,
): Promise<HardhatRuntimeEnvironment> {
  return HardhatRuntimeEnvironmentImplementation.create(
    config,
    userProvidedGlobalArguments,
    unsafeOptions,
  );
}

export { resolvePluginList } from "./internal/plugins/resolve-plugin-list.js";
export { buildGlobalParametersMap } from "./internal/global-parameters.js";
