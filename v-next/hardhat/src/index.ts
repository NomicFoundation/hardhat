import type { ArtifactManager } from "./types/artifacts.js";
import type { HardhatConfig } from "./types/config.js";
import type { GlobalOptions } from "./types/global-options.js";
import type { HookManager } from "./types/hooks.js";
import type { HardhatRuntimeEnvironment } from "./types/hre.js";
import type { NetworkManager } from "./types/network.js";
import type { SolidityBuildSystem } from "./types/solidity/build-system.js";
import type { TaskManager } from "./types/tasks.js";
import type { UserInterruptionManager } from "./types/user-interruptions.js";

import { getOrCreateGlobalHardhatRuntimeEnvironment } from "./internal/hre-initialization.js";

// NOTE: We import the builtin plugins in this module, so that their
// type-extensions are loaded when the user imports `hardhat`.
import "./internal/builtin-plugins/index.js";

const hre: HardhatRuntimeEnvironment =
  // eslint-disable-next-line no-restricted-syntax -- Allow top-level await here
  await getOrCreateGlobalHardhatRuntimeEnvironment();

export const config: HardhatConfig = hre.config;
export const tasks: TaskManager = hre.tasks;
export const globalOptions: GlobalOptions = hre.globalOptions;
export const hooks: HookManager = hre.hooks;
export const interruptions: UserInterruptionManager = hre.interruptions;

// NOTE: This is a small architectural violation, as the network manager comes
// from a builtin plugin, and plugins can't add their own exports here.
export const network: NetworkManager = hre.network;
export const artifacts: ArtifactManager = hre.artifacts;
export const solidity: SolidityBuildSystem = hre.solidity;

export default hre;
