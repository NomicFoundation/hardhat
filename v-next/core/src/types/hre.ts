import type { GlobalOptions } from "./global-options.js";
import type { UserInterruptionManager } from "./user-interruptions.js";
import type { HardhatConfig } from "../types/config.js";

/**
 * The Hardhat Runtime Environment (HRE) is an object that exposes
 * all the functionality available through Hardhat.
 */
export interface HardhatRuntimeEnvironment {
  readonly config: HardhatConfig;
  readonly globalOptions: GlobalOptions;
  readonly interruptions: UserInterruptionManager;
  // These fields are defined using module agumentation in this same package:
  // readonly hooks: HookManager;
  // readonly tasks: TaskManager;
}
