import type { ChainType } from "../../../../../types/network.js";

import { styleText } from "node:util";

import { assertHardhatInvariant } from "@nomicfoundation/hardhat-errors";

import {
  getCurrentHardfork,
  hardforkGte,
  L1HardforkName,
  OpHardforkName,
} from "../types/hardfork.js";

export function getL1HardforkName(name: string): L1HardforkName {
  const hardforkName =
    Object.values(L1HardforkName)[
      Object.values<string>(L1HardforkName).indexOf(name)
    ];

  assertHardhatInvariant(
    hardforkName !== undefined,
    `Invalid hardfork name ${name}`,
  );

  return hardforkName;
}

// Tracks which (chainType, hardfork) pairs have already been warned about, so
// we only print the experimental-hardfork warning once per process.
const warnedHardforks = new Set<string>();

/**
 * Prints a warning if `hardfork` is strictly beyond the latest stable hardfork
 * for the given chain type (i.e. an experimental fork that EDR supports but
 * hasn't promoted to latest yet). The warning is emitted at
 * most once per (chainType, hardfork) pair for the lifetime of the process.
 */
export function warnIfExperimentalHardfork(
  hardfork: string,
  chainType: ChainType,
  warn: (message: string) => void = (message) => console.error(message),
): void {
  const latestStable = getCurrentHardfork(chainType);

  // Only warn for hardforks strictly beyond the latest stable one.
  if (
    hardfork === latestStable ||
    !hardforkGte(hardfork, latestStable, chainType)
  ) {
    return;
  }

  const key = `${chainType}:${hardfork}`;

  if (warnedHardforks.has(key)) {
    return;
  }

  warnedHardforks.add(key);

  warn(
    styleText(["bold", "yellow"], "Warning:") +
      ` you have configured the "${hardfork}" hardfork, which is experimental ` +
      `and not yet finalized, so its behavior may change or be incomplete. ` +
      `The latest stable hardfork is "${latestStable}". ` +
      `Keep Hardhat up to date to track changes to "${hardfork}" and to pick up ` +
      `its stable version once it activates on mainnet.\n`,
  );
}

export function getOpHardforkName(name: string): OpHardforkName {
  const hardforkName =
    Object.values(OpHardforkName)[
      Object.values<string>(OpHardforkName).indexOf(name)
    ];

  assertHardhatInvariant(
    hardforkName !== undefined,
    `Invalid hardfork name ${name}`,
  );

  return hardforkName;
}
