import type { HardhatRuntimeEnvironment } from "../types/hre.js";

import { createHardhatRuntimeEnvironment } from "@nomicfoundation/hardhat-core";

let hre: HardhatRuntimeEnvironment;

/**
 * This function returns a singleton instance of the Hardhat Runtime Environment.
 *
 * It exists so that the CLI and the programmatic API are always using the same HRE instance.
 *
 * Note: Only the params of the first call are used.
 */
export async function getHardhatRuntimeEnvironmentSingleton(
  ...params: Parameters<typeof createHardhatRuntimeEnvironment>
): Promise<HardhatRuntimeEnvironment> {
  if (hre === undefined) {
    hre = await createHardhatRuntimeEnvironment(...params);
  }

  return hre;
}
