import type { HardhatRuntimeEnvironment } from "../types/hre.js";

import { createHardhatRuntimeEnvironment } from "@ignored/hardhat-vnext-core";

let hre: HardhatRuntimeEnvironment | undefined;

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

/**
 * This function resets the singleton instance of the Hardhat Runtime Environment.
 *
 * It should be used only in tests.
 */
export function resetHardhatRuntimeEnvironmentSingleton() {
  hre = undefined;
}
