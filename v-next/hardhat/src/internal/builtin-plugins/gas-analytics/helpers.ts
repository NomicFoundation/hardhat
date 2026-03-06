import type { GasAnalyticsManager } from "./types.js";
import type { HookContext } from "../../../types/hooks.js";
import type { HardhatRuntimeEnvironment } from "../../../types/hre.js";

import { assertHardhatInvariant } from "@nomicfoundation/hardhat-errors";

import { GasAnalyticsManagerImplementation } from "./gas-analytics-manager.js";
import {
  testRunDone,
  testRunStart,
  testWorkerDone,
} from "./hook-handlers/test.js";

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

/**
 * The following helpers are kept for backward compatibility with older versions
 * of test runner plugins (hardhat-mocha, hardhat-node-test-runner) that import
 * from "hardhat/internal/gas-analytics".
 */

export async function markTestRunStart(id: string): Promise<void> {
  const { default: hre } = await import("../../../index.js");
  await testRunStart(hre, id);
}

export async function markTestWorkerDone(id: string): Promise<void> {
  const { default: hre } = await import("../../../index.js");
  await testWorkerDone(hre, id);
}

export async function markTestRunDone(id: string): Promise<void> {
  const { default: hre } = await import("../../../index.js");
  await testRunDone(hre, id);
}
