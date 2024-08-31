import type { UnsafeHardhatRuntimeEnvironmentOptions } from "./core/types.js";
import type { HardhatUserConfig } from "../types/config.js";
import type { GlobalOptions } from "../types/global-options.js";
import type { HardhatRuntimeEnvironment } from "../types/hre.js";

import { BUILTIN_GLOBAL_OPTIONS_DEFINITIONS } from "./builtin-global-options.js";
import { builtinPlugins } from "./builtin-plugins/index.js";
import {
  importUserConfig,
  resolveHardhatConfigPath,
} from "./config-loading.js";
import { buildGlobalOptionDefinitions } from "./core/global-options.js";
import {
  resolveProjectRoot,
  HardhatRuntimeEnvironmentImplementation,
} from "./core/hre.js";
import { resolvePluginList } from "./core/plugins/resolve-plugin-list.js";
import {
  getGlobalHardhatRuntimeEnvironment,
  setGlobalHardhatRuntimeEnvironment,
} from "./global-hre-instance.js";

/**
 * Creates an instances of the Hardhat Runtime Environment.
 *
 * @param config - The user's Hardhat configuration. Note that the config
 * doesn't have to come from a file, but if it does, you should provide its
 * path as the `config` property in the `userProvidedGlobalOptions` object.
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

/**
 * Gets the global Hardhat Runtime Environment, or creates it if it doesn't exist.
 *
 * This function is meant to be used when `hardhat` is imported as a library.
 */
export async function getOrCreateGlobalHardhatRuntimeEnvironment(): Promise<HardhatRuntimeEnvironment> {
  let globalHre = getGlobalHardhatRuntimeEnvironment();

  if (globalHre !== undefined) {
    return globalHre;
  }

  const configPath = await resolveHardhatConfigPath();
  const projectRoot = await resolveProjectRoot(configPath);
  const userConfig = await importUserConfig(configPath);

  globalHre = await createHardhatRuntimeEnvironment(
    userConfig,
    { config: configPath },
    projectRoot,
  );

  setGlobalHardhatRuntimeEnvironment(globalHre);

  return globalHre;
}
