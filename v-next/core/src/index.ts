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
 * @param projectRoot - The root of the Hardhat project. Hardhat expects this
 * to be the root of the npm project containing your config file. If none is
 * provided, it will use the root of the npm project that contains the CWD.
 * @param unsafeOptions - Options used to bypass some initialization, to avoid
 *  redoing it in the CLI. Should only be used in the official CLI.
 * @returns The Hardhat Runtime Environment.
 */
export async function createBaseHardhatRuntimeEnvironment(
  config: HardhatUserConfig,
  userProvidedGlobalOptions: Partial<GlobalOptions> = {},
  projectRoot?: string,
  unsafeOptions?: UnsafeHardhatRuntimeEnvironmentOptions,
): Promise<HardhatRuntimeEnvironment> {
  return HardhatRuntimeEnvironmentImplementation.create(
    config,
    userProvidedGlobalOptions,
    projectRoot,
    unsafeOptions,
  );
}

export { parseArgumentValue } from "./internal/arguments.js";
export { resolvePluginList } from "./internal/plugins/resolve-plugin-list.js";
export { buildGlobalOptionDefinitions } from "./internal/global-options.js";
