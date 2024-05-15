import {
  createHardhatRuntimeEnvironment as originalCreateHardhatRuntimeEnvironment,
  resolvePluginList,
} from "@nomicfoundation/hardhat-core";

import { builtinPlugins } from "./internal/builtin-plugins/index.js";
import { HardhatUserConfig } from "./types/config.js";
import { GlobalArguments } from "./types/global-parameters.js";
import { HardhatRuntimeEnvironment } from "./types/hre.js";

/**
 * Creates an instances of the Hardhat Runtime Environment.
 *
 * @param config - The user's Hardhat configuration.
 * @param userProvidedGlobalArguments - The global arguments provided by the
 *  user.
 * @returns The Hardhat Runtime Environment.
 */
export async function createHardhatRuntimeEnvironment(
  config: HardhatUserConfig,
  userProvidedGlobalArguments: Partial<GlobalArguments> = {},
): Promise<HardhatRuntimeEnvironment> {
  const plugins = [...builtinPlugins, ...(config.plugins ?? [])];
  const resolvedPlugins = resolvePluginList(plugins);

  return originalCreateHardhatRuntimeEnvironment(
    config,
    userProvidedGlobalArguments,
    { resolvedPlugins },
  );
}
