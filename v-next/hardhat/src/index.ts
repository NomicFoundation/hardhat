import type { HardhatConfig } from "./types/config.js";
import type { GlobalOptions } from "./types/global-options.js";
import type { HookManager } from "./types/hooks.js";
import type { HardhatRuntimeEnvironment } from "./types/hre.js";
import type { TaskManager } from "./types/tasks.js";
import type { UserInterruptionManager } from "./types/user-interruptions.js";

import { resolveHardhatConfigPath } from "./config.js";
import { importUserConfig } from "./internal/helpers/config-loading.js";
import { getHardhatRuntimeEnvironmentSingleton } from "./internal/hre-singleton.js";

/* eslint-disable no-restricted-syntax -- Allow top-level await here */
const configPath = await resolveHardhatConfigPath();
const userConfig = await importUserConfig(configPath);

const hre: HardhatRuntimeEnvironment =
  await getHardhatRuntimeEnvironmentSingleton(userConfig);
/* eslint-enable no-restricted-syntax */

export const config: HardhatConfig = hre.config;
export const tasks: TaskManager = hre.tasks;
export const globalOptions: GlobalOptions = hre.globalOptions;
export const hooks: HookManager = hre.hooks;
export const interruptions: UserInterruptionManager = hre.interruptions;

export default hre;
