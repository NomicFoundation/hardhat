import type { HardhatRuntimeEnvironment } from "../../../../types/hre.js";

import {
  testRunDone,
  testRunStart,
  testWorkerDone,
} from "../hook-handlers/test.js";

/**
 * The following helpers are kept for backward compatibility with older versions
 * of test runner plugins (hardhat-mocha, hardhat-node-test-runner) that import
 * from "hardhat/internal/gas-analytics".
 */

let cachedHre: HardhatRuntimeEnvironment | undefined;
async function getHre(): Promise<HardhatRuntimeEnvironment> {
  if (cachedHre === undefined) {
    const { default: hre } = await import("../../../../index.js");
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
