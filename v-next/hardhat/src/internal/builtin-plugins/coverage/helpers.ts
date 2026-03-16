import type { CoverageManager } from "./types.js";
import type { HookContext } from "../../../types/hooks.js";
import type { HardhatRuntimeEnvironment } from "../../../types/hre.js";

import path from "node:path";

import { assertHardhatInvariant } from "@nomicfoundation/hardhat-errors";

import { HardhatRuntimeEnvironmentImplementation } from "../../core/hre.js";

import { CoverageManagerImplementation } from "./coverage-manager.js";
import {
  testRunDone,
  testRunStart,
  testWorkerDone,
} from "./hook-handlers/test.js";

export function getCoveragePath(rootPath: string): string {
  return path.join(rootPath, "coverage");
}

export function getCoverageManager(
  hookContextOrHre: HookContext | HardhatRuntimeEnvironment,
): CoverageManager {
  assertHardhatInvariant(
    "_coverage" in hookContextOrHre &&
      hookContextOrHre._coverage instanceof CoverageManagerImplementation,
    "Expected _coverage to be an instance of CoverageManagerImplementation",
  );
  return hookContextOrHre._coverage;
}

export function setCoverageManager(
  hre: HardhatRuntimeEnvironment,
  coverageManager: CoverageManager,
): void {
  assertHardhatInvariant(
    hre instanceof HardhatRuntimeEnvironmentImplementation,
    "Expected HRE to be an instance of HardhatRuntimeEnvironmentImplementation",
  );
  hre._coverage = coverageManager;
}

/**
 * The following helpers are kept for backward compatibility with older versions
 * of test runner plugins (hardhat-mocha, hardhat-node-test-runner) that import
 * from "hardhat/internal/coverage".
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
