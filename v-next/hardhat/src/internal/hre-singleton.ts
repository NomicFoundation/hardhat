import type { HardhatRuntimeEnvironment } from "../types/hre.js";

import { assertHardhatInvariant } from "@ignored/hardhat-vnext-errors";

let hre: HardhatRuntimeEnvironment | undefined;

/**
 * This function returns a singleton instance of the Hardhat Runtime Environment
 * if it was already initialized.
 *
 * It exists so that the CLI and the programmatic API are always using the same HRE instance.
 */
export function getHardhatRuntimeEnvironmentSingleton():
  | HardhatRuntimeEnvironment
  | undefined {
  return hre;
}

/**
 * Sets the singleton instance of the Hardhat Runtime Environment.
 */
export function setHardhatRuntimeEnvironmentSingleton(
  newHre: HardhatRuntimeEnvironment,
): void {
  assertHardhatInvariant(hre === undefined, "HRE singleton already set");
  hre = newHre;
}

/**
 * This function resets the singleton instance of the Hardhat Runtime Environment.
 *
 * It should be used only in tests.
 */
export function resetHardhatRuntimeEnvironmentSingleton(): void {
  hre = undefined;
}
