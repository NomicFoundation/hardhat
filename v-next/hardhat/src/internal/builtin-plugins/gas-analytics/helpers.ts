import { assertHardhatInvariant } from "@nomicfoundation/hardhat-errors";
import chalk from "chalk";

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
  if (hre.globalOptions.gasStats === true) {
    assertHardhatInvariant(
      hre instanceof HardhatRuntimeEnvironmentImplementation,
      "Expected HRE to be an instance of HardhatRuntimeEnvironmentImplementation",
    );
    await hre._gasAnalytics.clearGasMeasurements(id);
  }
}

export async function markTestWorkerDone(id: string): Promise<void> {
  const { default: hre } = await import("../../../index.js");
  if (hre.globalOptions.gasStats === true) {
    assertHardhatInvariant(
      hre instanceof HardhatRuntimeEnvironmentImplementation,
      "Expected HRE to be an instance of HardhatRuntimeEnvironmentImplementation",
    );
    await hre._gasAnalytics.saveGasMeasurements(id);
  }
}

export async function markTestRunDone(id: string): Promise<void> {
  const { default: hre } = await import("../../../index.js");
  if (hre.globalOptions.gasStats === true) {
    assertHardhatInvariant(
      hre instanceof HardhatRuntimeEnvironmentImplementation,
      "Expected HRE to be an instance of HardhatRuntimeEnvironmentImplementation",
    );
    await hre._gasAnalytics.reportGasStats(id);
  }
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
