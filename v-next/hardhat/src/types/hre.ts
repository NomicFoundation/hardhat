import type { GlobalOptions } from "./global-options.js";
import type { UserInterruptionManager } from "./user-interruptions.js";
import type { HardhatConfig } from "../types/config.js";

/**
 * The Hardhat Runtime Environment (HRE) is an object that exposes
 * all the functionality available through Hardhat.
 */
export interface HardhatRuntimeEnvironment {
  readonly config: Readonly<HardhatConfig>;
  readonly globalOptions: Readonly<GlobalOptions>;
  readonly interruptions: Readonly<UserInterruptionManager>;
  // These fields are defined using module agumentation despite being part of
  // Hardhat's core:
  // readonly hooks: HookManager;
  // readonly tasks: TaskManager;
}
