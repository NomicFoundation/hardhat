import type { HardhatConfig } from "./types/config.js";
import type { GlobalOptions } from "./types/global-options.js";
import type { HookManager } from "./types/hooks.js";
import type { HardhatRuntimeEnvironment } from "./types/hre.js";
import type { TaskManager } from "./types/tasks.js";
import type { UserInterruptionManager } from "./types/user-interruptions.js";

import { resolveProjectRoot } from "@ignored/hardhat-vnext-core";

import { resolveHardhatConfigPath } from "./config.js";
import { createHardhatRuntimeEnvironment } from "./hre.js";
import {
  getGlobalHardhatRuntimeEnvironment,
  setGlobalHardhatRuntimeEnvironment,
  resetGlobalHardhatRuntimeEnvironment,
} from "./internal/global-hre-instance.js";
import { importUserConfig } from "./internal/helpers/config-loading.js";

let maybeHre: HardhatRuntimeEnvironment | undefined =
  getGlobalHardhatRuntimeEnvironment();

if (maybeHre === undefined) {
  /* eslint-disable no-restricted-syntax -- Allow top-level await here */
  const configPath = await resolveHardhatConfigPath();
  const projectRoot = await resolveProjectRoot(configPath);
  const userConfig = await importUserConfig(configPath);

  maybeHre = await createHardhatRuntimeEnvironment(userConfig, {}, projectRoot);
  /* eslint-enable no-restricted-syntax */

  setGlobalHardhatRuntimeEnvironment(maybeHre);
}

const hre: HardhatRuntimeEnvironment = maybeHre;

export const config: HardhatConfig = hre.config;
export const tasks: TaskManager = hre.tasks;
export const globalOptions: GlobalOptions = hre.globalOptions;
export const hooks: HookManager = hre.hooks;
export const interruptions: UserInterruptionManager = hre.interruptions;

// We need to re-export this function so that plugins can use it.
export const _resetGlobalHardhatRuntimeEnvironment: typeof resetGlobalHardhatRuntimeEnvironment =
  function (): void {
    maybeHre = undefined;

    resetGlobalHardhatRuntimeEnvironment();
  };

export default hre;
