import { HardhatConfig, HardhatUserConfig } from "../types/config.js";
import { HookManager } from "./hooks.js";
import { UserInterruptionManager } from "./user-interruptions.js";

/**
 * The Hardhat Runtime Environment (HRE) is an object that exposes
 * all the functionality available through Hardhat.
 */
export interface HardhatRuntimeEnvironment {
  readonly userConfig: HardhatUserConfig;
  readonly config: HardhatConfig;
  readonly hooks: HookManager;
  readonly interruptions: UserInterruptionManager;

  // Network
  // Build system
  // Task runner
}

// Defined here to avoid a direct circular dependency.
declare module "./hooks.js" {
  /**
   * Hardhat Runtime Environment-related hooks.
   */
  interface HardhatRuntimeEnvironmentHooks {
    created: (
      context: HookContext,
      hre: HardhatRuntimeEnvironment,
    ) => Promise<void>;
  }

  export interface HardhatHooks {
    hre: HardhatRuntimeEnvironmentHooks;
  }
}
