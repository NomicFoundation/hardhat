import { GlobalParameterMap } from "./internal/global-parameters.js";
import { HardhatRuntimeEnvironmentImplementation } from "./internal/hre.js";
import { HardhatUserConfig } from "./types/config.js";
import { GlobalArguments } from "./types/global-parameters.js";
import { HardhatRuntimeEnvironment } from "./types/hre.js";
import { HardhatPlugin } from "./types/plugins.js";

/**
 * Creates an instances of the Hardhat Runtime Environment.
 *
 * @param config - The user's Hardhat configuration.
 * @param userProvidedGlobalArguments - The global arguments provided by the
 *  user.
 * @param unsafeOptions - Options are used to bypass some initialization, to
 *  avoid redoing it in the CLI. Should only be used in the official CLI.
 * @returns The Hardhat Runtime Environment.
 */
export async function createHardhatRuntimeEnvironment(
  config: HardhatUserConfig,
  userProvidedGlobalArguments: Partial<GlobalArguments> = {},
  unsafeOptions?: {
    resolvedPlugins: HardhatPlugin[];
    globalParameterMap: GlobalParameterMap;
  },
): Promise<HardhatRuntimeEnvironment> {
  return HardhatRuntimeEnvironmentImplementation.create(
    config,
    userProvidedGlobalArguments,
    unsafeOptions,
  );
}

export { resolvePluginList } from "./internal/plugins/resolve-plugin-list.js";
export type {
  GlobalParameterMap,
  GlobalParameterMapEntry,
} from "./internal/global-parameters.js";
export { buildGlobalParameterMap } from "./internal/global-parameters.js";
