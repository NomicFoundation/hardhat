import type { HardhatUserConfig } from "./types/config.js";
import type { GlobalOptions } from "./types/global-options.js";
import type { HardhatRuntimeEnvironment } from "./types/hre.js";
import type { UnsafeHardhatRuntimeEnvironmentOptions } from "@ignored/hardhat-vnext-core/types/cli";

import {
  createHardhatRuntimeEnvironment as originalCreateHardhatRuntimeEnvironment,
  resolvePluginList,
} from "@ignored/hardhat-vnext-core";

import { builtinPlugins } from "./internal/builtin-plugins/index.js";

/**
 * Creates an instances of the Hardhat Runtime Environment.
 *
 * @param config - The user's Hardhat configuration.
 * @param userProvidedGlobalOptions - The global options provided by the
 *  user.
 * @returns The Hardhat Runtime Environment.
 */
export async function createHardhatRuntimeEnvironment(
  config: HardhatUserConfig,
  userProvidedGlobalOptions: Partial<GlobalOptions> = {},
  unsafeOptions: UnsafeHardhatRuntimeEnvironmentOptions = {},
): Promise<HardhatRuntimeEnvironment> {
  if (unsafeOptions.resolvedPlugins === undefined) {
    const plugins = [...builtinPlugins, ...(config.plugins ?? [])];

    // We resolve the plugins within npm modules relative to the current working
    const basePathForNpmResolution = process.cwd();
    const resolvedPlugins = await resolvePluginList(
      plugins,
      basePathForNpmResolution,
    );

    unsafeOptions.resolvedPlugins = resolvedPlugins;
  }

  return originalCreateHardhatRuntimeEnvironment(
    config,
    userProvidedGlobalOptions,
    unsafeOptions,
  );
}
