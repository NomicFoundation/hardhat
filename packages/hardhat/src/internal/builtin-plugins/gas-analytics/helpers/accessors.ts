import type { HookContext } from "../../../../types/hooks.js";
import type { HardhatRuntimeEnvironment } from "../../../../types/hre.js";
import type { GasAnalyticsManager } from "../types.js";

import { assertHardhatInvariant } from "@nomicfoundation/hardhat-errors";

import { HardhatRuntimeEnvironmentImplementation } from "../../../core/hre.js";
import { GasAnalyticsManagerImplementation } from "../gas-analytics-manager.js";

export function getGasAnalyticsManager(
  hookContextOrHre: HookContext | HardhatRuntimeEnvironment,
): GasAnalyticsManager {
  assertHardhatInvariant(
    "_gasAnalytics" in hookContextOrHre &&
      hookContextOrHre._gasAnalytics instanceof
        GasAnalyticsManagerImplementation,
    "Expected _gasAnalytics to be an instance of GasAnalyticsManagerImplementation",
  );
  return hookContextOrHre._gasAnalytics;
}

export function setGasAnalyticsManager(
  hre: HardhatRuntimeEnvironment,
  gasAnalyticsManager: GasAnalyticsManager,
): void {
  assertHardhatInvariant(
    hre instanceof HardhatRuntimeEnvironmentImplementation,
    "Expected HRE to be an instance of HardhatRuntimeEnvironmentImplementation",
  );
  hre._gasAnalytics = gasAnalyticsManager;
}
