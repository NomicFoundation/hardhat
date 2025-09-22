import type { GlobalOptions } from "./global-options.js";
import type { UserInterruptionManager } from "./user-interruptions.js";
import type { HardhatConfig, HardhatUserConfig } from "../types/config.js";

export interface HardhatRuntimeEnvironmentVersions {
  readonly hardhatVersion: string;
  readonly edrVersion: string;
}

/**
 * The Hardhat Runtime Environment (HRE) is an object that exposes
 * all the functionality available through Hardhat.
 */
export interface HardhatRuntimeEnvironment {
  readonly config: HardhatConfig;
  readonly userConfig: HardhatUserConfig;
  readonly globalOptions: GlobalOptions;
  readonly interruptions: UserInterruptionManager;
  readonly versions: HardhatRuntimeEnvironmentVersions;
  // These fields are defined using module agumentation despite being part of
  // Hardhat's core:
  // readonly hooks: HookManager;
  // readonly tasks: TaskManager;
}
