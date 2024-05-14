import { HardhatConfig } from "../types/config.js";
import { GlobalArguments } from "./global-parameters.js";
import { UserInterruptionManager } from "./user-interruptions.js";

/**
 * The Hardhat Runtime Environment (HRE) is an object that exposes
 * all the functionality available through Hardhat.
 */
export interface HardhatRuntimeEnvironment {
  readonly config: HardhatConfig;
  readonly globalArguments: GlobalArguments;
  readonly interruptions: UserInterruptionManager;
  // These fields are defined using module agumentation in this same package:
  // readonly hooks: HookManager;
  // readonly tasks: TaskManager;
}
