// NOTE: This file is imported from hot paths — the plugin's `created` hook
// handler and task-actions that may run on every `hardhat test` invocation
// regardless of whether the feature is enabled. It must stay lightweight:
// do not add top-level imports that pull in the gas-analytics-manager module
// graph (debug, node:crypto, file-system traversal, etc.), or the
// `--gas-stats` lazy-load is silently defeated for every caller.
// If a new helper needs a heavy dependency, put it in a sibling file
// (e.g. `helpers/utils.ts`) so the accessors file's import cost stays flat.

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
