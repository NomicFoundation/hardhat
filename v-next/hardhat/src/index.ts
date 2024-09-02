import type { HardhatConfig } from "./types/config.js";
import type { GlobalOptions } from "./types/global-options.js";
import type { HookManager } from "./types/hooks.js";
import type { HardhatRuntimeEnvironment } from "./types/hre.js";
import type { TaskManager } from "./types/tasks.js";
import type { UserInterruptionManager } from "./types/user-interruptions.js";

import { getOrCreateGlobalHardhatRuntimeEnvironment } from "./internal/hre-intialization.js";

// NOTE: We import the builtin plugins in this module, so that their
// type-extensions are loaded then the user imports `hardhat`.
import "./internal/builtin-plugins/index.js";

const hre: HardhatRuntimeEnvironment =
  // eslint-disable-next-line no-restricted-syntax -- Allow top-level await here
  await getOrCreateGlobalHardhatRuntimeEnvironment();

export const config: HardhatConfig = hre.config;
export const tasks: TaskManager = hre.tasks;
export const globalOptions: GlobalOptions = hre.globalOptions;
export const hooks: HookManager = hre.hooks;
export const interruptions: UserInterruptionManager = hre.interruptions;

export default hre;
