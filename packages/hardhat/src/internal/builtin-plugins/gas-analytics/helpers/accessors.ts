import type { HookContext } from "../../../../types/hooks.js";
import type { HardhatRuntimeEnvironment } from "../../../../types/hre.js";
import type { GasAnalyticsManager } from "../types.js";

import { assertHardhatInvariant } from "@nomicfoundation/hardhat-errors";

import { HardhatRuntimeEnvironmentImplementation } from "../../../core/hre.js";

export function getGasAnalyticsManager(
  hookContextOrHre: HookContext | HardhatRuntimeEnvironment,
): GasAnalyticsManager {
  assertHardhatInvariant(
    hookContextOrHre instanceof HardhatRuntimeEnvironmentImplementation &&
      hookContextOrHre._gasAnalytics !== undefined,
    "Expected _gasAnalytics to be installed on the HRE",
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
