import chalk from "chalk";

import {
  testRunDone,
  testRunStart,
  testWorkerDone,
} from "./hook-handlers/test.js";

/**
 * The following helpers are kept for backward compatibility with older versions
 * of test runner plugins (hardhat-mocha, hardhat-node-test-runner) that import
 * from "hardhat/internal/gas-analytics".
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
