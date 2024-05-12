import { HardhatConfig, HardhatUserConfig } from "../types/config.js";
import { GlobalArguments } from "./global-parameters.js";
import { UserInterruptionManager } from "./user-interruptions.js";

/**
 * The Hardhat Runtime Environment (HRE) is an object that exposes
 * all the functionality available through Hardhat.
 */
export interface HardhatRuntimeEnvironment {
  readonly userConfig: HardhatUserConfig;
  readonly config: HardhatConfig;
  readonly interruptions: UserInterruptionManager;
  readonly globalArguments: GlobalArguments;

  // Network
  // Build system
}
