import type { GasAnalyticsManager } from "./types.js";
import type { HookContext } from "../../../types/hooks.js";
import type { HardhatRuntimeEnvironment } from "../../../types/hre.js";

import { assertHardhatInvariant } from "@nomicfoundation/hardhat-errors";
import chalk from "chalk";

import { HardhatRuntimeEnvironmentImplementation } from "../../core/hre.js";

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

/**
 * The following helpers are kept for backward compatibility with older versions
 * of test runner plugins (hardhat-mocha, hardhat-node-test-runner) that import
 * from "hardhat/internal/gas-analytics".
 */

// Dynamically import the HRE when calling the helpers
let cachedHre: HardhatRuntimeEnvironment | undefined;
async function getHre(): Promise<HardhatRuntimeEnvironment> {
  if (cachedHre === undefined) {
    const { default: hre } = await import("../../../index.js");
    cachedHre = hre;
  }
  return cachedHre;
}

export async function markTestRunStart(id: string): Promise<void> {
  const hre = await getHre();
  await testRunStart(hre, id);
}

export async function markTestWorkerDone(id: string): Promise<void> {
  const hre = await getHre();
  await testWorkerDone(hre, id);
}

export async function markTestRunDone(id: string): Promise<void> {
  const hre = await getHre();
  await testRunDone(hre, id);
}

export function formatSectionHeader(
  sectionName: string,
  {
    changedLength,
    addedLength,
    removedLength,
  }: {
    changedLength: number;
    addedLength: number;
    removedLength: number;
  },
): string {
  const parts: string[] = [];

  if (changedLength > 0) {
    parts.push(`${changedLength} changed`);
  }
  if (addedLength > 0) {
    parts.push(`${addedLength} added`);
  }
  if (removedLength > 0) {
    parts.push(`${removedLength} removed`);
  }

  return `${sectionName}: ${chalk.gray(parts.join(", "))}`;
}
