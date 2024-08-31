import type { UnsafeHardhatRuntimeEnvironmentOptions } from "./internal/core/types.js";
import type { HardhatUserConfig } from "./types/config.js";
import type { GlobalOptions } from "./types/global-options.js";
import type { HardhatRuntimeEnvironment } from "./types/hre.js";

import { BUILTIN_GLOBAL_OPTIONS_DEFINITIONS } from "./internal/builtin-global-options.js";
import { builtinPlugins } from "./internal/builtin-plugins/index.js";
import { buildGlobalOptionDefinitions } from "./internal/core/global-options.js";
import {
  HardhatRuntimeEnvironmentImplementation,
  resolveProjectRoot,
} from "./internal/core/hre.js";
import { resolvePluginList } from "./internal/core/plugins/resolve-plugin-list.js";

export { resolveHardhatConfigPath } from "./internal/helpers/config-loading.js";

/**
 * Creates an instances of the Hardhat Runtime Environment.
 *
 * @param config - The user's Hardhat configuration.
 * @param userProvidedGlobalOptions - The global options provided by the
 *  user.
 * @param projectRoot - The root of the Hardhat project. Hardhat expects this
 * to be the root of the npm project containing your config file. If none is
 * provided, it will use the root of the npm project that contains the CWD.
 * @returns The Hardhat Runtime Environment.
 */
export async function createHardhatRuntimeEnvironment(
  config: HardhatUserConfig,
  userProvidedGlobalOptions: Partial<GlobalOptions> = {},
  projectRoot?: string,
  unsafeOptions: UnsafeHardhatRuntimeEnvironmentOptions = {},
): Promise<HardhatRuntimeEnvironment> {
  const resolvedProjectRoot = await resolveProjectRoot(projectRoot);

  if (unsafeOptions.resolvedPlugins === undefined) {
    const plugins = [...builtinPlugins, ...(config.plugins ?? [])];

    const resolvedPlugins = await resolvePluginList(
      resolvedProjectRoot,
      plugins,
    );

    unsafeOptions.resolvedPlugins = resolvedPlugins;
  }

  if (unsafeOptions.globalOptionDefinitions === undefined) {
    const pluginGlobalOptionDefinitions = buildGlobalOptionDefinitions(
      unsafeOptions.resolvedPlugins,
    );

    const globalOptionDefinitions = new Map([
      ...BUILTIN_GLOBAL_OPTIONS_DEFINITIONS,
      ...pluginGlobalOptionDefinitions,
    ]);

    unsafeOptions.globalOptionDefinitions = globalOptionDefinitions;
  }

  return HardhatRuntimeEnvironmentImplementation.create(
    config,
    userProvidedGlobalOptions,
    resolvedProjectRoot,
    unsafeOptions,
  );
}
