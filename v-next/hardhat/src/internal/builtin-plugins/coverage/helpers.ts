import { assertHardhatInvariant } from "@nomicfoundation/hardhat-errors";

import { HardhatRuntimeEnvironmentImplementation } from "../../core/hre.js";

/**
 * NOTE: The following helpers interact with the global HRE instance only;
 * This is OK because:
 * - They are intended for the internal use only. They are exposed via the
 *   internal public API only.
 * - We know the HRE has been initialized by the time they are used.
 */

export async function markTestRunStart(id: string): Promise<void> {
  const { default: hre } = await import("../../../index.js");
  if (hre.globalOptions.coverage === true) {
    assertHardhatInvariant(
      hre instanceof HardhatRuntimeEnvironmentImplementation,
      "Expected HRE to be an instance of HardhatRuntimeEnvironmentImplementation",
    );
    await hre._coverage.clearData(id);
  }
}

export async function markTestWorkerDone(id: string): Promise<void> {
  const { default: hre } = await import("../../../index.js");
  if (hre.globalOptions.coverage === true) {
    assertHardhatInvariant(
      hre instanceof HardhatRuntimeEnvironmentImplementation,
      "Expected HRE to be an instance of HardhatRuntimeEnvironmentImplementation",
    );
    await hre._coverage.saveData(id);
  }
}

export async function markTestRunDone(id: string): Promise<void> {
  const { default: hre } = await import("../../../index.js");
  if (hre.globalOptions.coverage === true) {
    assertHardhatInvariant(
      hre instanceof HardhatRuntimeEnvironmentImplementation,
      "Expected HRE to be an instance of HardhatRuntimeEnvironmentImplementation",
    );
    await hre._coverage.report(id);
  }
}
