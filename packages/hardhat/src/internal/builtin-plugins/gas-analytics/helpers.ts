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

/**
 * Converts an internal FQN (e.g. `"project/contracts/Foo.sol:Foo"` or
 * `"npm/@oz/contracts@5.0.0/token/ERC20.sol:ERC20"`) to its user-friendly
 * form by stripping the `project/` prefix or npm version segment.
 */
export function getUserFqn(inputFqn: string): string {
  if (inputFqn.startsWith("project/")) {
    return inputFqn.slice("project/".length);
  }

  if (inputFqn.startsWith("npm/")) {
    const withoutPrefix = inputFqn.slice("npm/".length);
    // Match "<pkg>@<version>/<rest>", where <pkg> may be scoped (@scope/pkg)
    const match = withoutPrefix.match(/^(@?[^@/]+(?:\/[^@/]+)*)@[^/]+\/(.*)$/);
    if (match !== null) {
      return `${match[1]}/${match[2]}`;
    }
    return withoutPrefix;
  }

  return inputFqn;
}

/**
 * Extracts the function name from a Solidity function signature
 * (e.g. `"transfer(address,uint256)"` → `"transfer"`).
 */
export function getFunctionName(signature: string): string {
  return signature.split("(")[0];
}

/**
 * Builds a deterministic string key for grouping gas measurements by
 * (contractFqn, proxyChain). Uses null-byte separators to avoid collisions.
 */
export function makeGroupKey(
  contractFqn: string,
  proxyChain: string[],
): string {
  if (proxyChain.length === 0) {
    return contractFqn;
  }
  return contractFqn + "\0" + proxyChain.join("\0");
}

/**
 * Returns a human-readable proxy label like `"(via Proxy2 → Proxy)"`,
 * or `undefined` for direct calls. Strips the last element (the
 * implementation) and converts internal FQNs to user-friendly format.
 */
export function getProxyLabel(proxyChain: string[]): string | undefined {
  const proxies = proxyChain.slice(0, -1).map(getUserFqn);
  if (proxies.length === 0) {
    return undefined;
  }
  return `(via ${proxies.join(" → ")})`;
}

/**
 * Returns a display key for a contract entry, appending the proxy label
 * when the call went through a proxy chain. Used for table headers and
 * JSON object keys.
 */
export function getDisplayKey(userFqn: string, proxyChain: string[]): string {
  const label = getProxyLabel(proxyChain);
  if (label === undefined) {
    return userFqn;
  }
  return `${userFqn} ${label}`;
}

export function avg(values: number[]): number {
  return values.reduce((a, c) => a + c, 0) / values.length;
}

export function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  return sorted.length % 2 === 1
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

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

// -- Backward compatibility helpers --

/**
 * The following helpers are kept for backward compatibility with older versions
 * of test runner plugins (hardhat-mocha, hardhat-node-test-runner) that import
 * from "hardhat/internal/gas-analytics".
 */

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
