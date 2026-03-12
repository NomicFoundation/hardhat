import path from "node:path";

import {
  testRunDone,
  testRunStart,
  testWorkerDone,
} from "./hook-handlers/test.js";

export function getCoveragePath(rootPath: string): string {
  return path.join(rootPath, "coverage");
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
