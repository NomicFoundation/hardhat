import { Common } from "@nomicfoundation/ethereumjs-common";
import { HardforkHistoryConfig } from "../../types/config";
import { HARDHAT_NETWORK_SUPPORTED_HARDFORKS } from "../constants";
import { assertHardhatInvariant } from "../core/errors";
import { InternalError } from "../core/providers/errors";

/* eslint-disable @nomiclabs/hardhat-internal-rules/only-hardhat-error */

export enum HardforkName {
  FRONTIER = "chainstart",
  HOMESTEAD = "homestead",
  DAO = "dao",
  TANGERINE_WHISTLE = "tangerineWhistle",
  SPURIOUS_DRAGON = "spuriousDragon",
  BYZANTIUM = "byzantium",
  CONSTANTINOPLE = "constantinople",
  PETERSBURG = "petersburg",
  ISTANBUL = "istanbul",
  MUIR_GLACIER = "muirGlacier",
  BERLIN = "berlin",
  LONDON = "london",
  ARROW_GLACIER = "arrowGlacier",
  GRAY_GLACIER = "grayGlacier",
  MERGE = "merge",
  SHANGHAI = "shanghai",
}

const HARDFORKS_ORDER: HardforkName[] = [
  HardforkName.FRONTIER,
  HardforkName.HOMESTEAD,
  HardforkName.DAO,
  HardforkName.TANGERINE_WHISTLE,
  HardforkName.SPURIOUS_DRAGON,
  HardforkName.BYZANTIUM,
  HardforkName.CONSTANTINOPLE,
  HardforkName.PETERSBURG,
  HardforkName.ISTANBUL,
  HardforkName.MUIR_GLACIER,
  HardforkName.BERLIN,
  HardforkName.LONDON,
  HardforkName.ARROW_GLACIER,
  HardforkName.GRAY_GLACIER,
  HardforkName.MERGE,
  HardforkName.SHANGHAI,
];

export function getHardforkName(name: string): HardforkName {
  const hardforkName =
    Object.values(HardforkName)[
      Object.values<string>(HardforkName).indexOf(name)
    ];

  assertHardhatInvariant(
    hardforkName !== undefined,
    `Invalid harfork name ${name}`
  );

  return hardforkName;
}

/**
 * Check if `hardforkA` is greater than or equal to `hardforkB`,
 * that is, if it includes all its changes.
 */
export function hardforkGte(
  hardforkA: HardforkName,
  hardforkB: HardforkName
): boolean {
  // This function should not load any ethereumjs library, as it's used during
  // the Hardhat initialization, and that would make it too slow.
  const indexA = HARDFORKS_ORDER.lastIndexOf(hardforkA);
  const indexB = HARDFORKS_ORDER.lastIndexOf(hardforkB);

  return indexA >= indexB;
}

export function selectHardfork(
  forkBlockNumber: bigint | undefined,
  currentHardfork: string,
  hardforkActivations: HardforkHistoryConfig | undefined,
  blockNumber: bigint
): string {
  if (forkBlockNumber === undefined || blockNumber >= forkBlockNumber) {
    return currentHardfork;
  }

  if (hardforkActivations === undefined || hardforkActivations.size === 0) {
    throw new InternalError(
      `No known hardfork for execution on historical block ${blockNumber.toString()} (relative to fork block number ${forkBlockNumber}). The node was not configured with a hardfork activation history.  See http://hardhat.org/custom-hardfork-history`
    );
  }

  /** search this._hardforkActivations for the highest block number that
   * isn't higher than blockNumber, and then return that found block number's
   * associated hardfork name. */
  const hardforkHistory: Array<[name: string, block: number]> = Array.from(
    hardforkActivations.entries()
  );
  const [hardfork, activationBlock] = hardforkHistory.reduce(
    ([highestHardfork, highestBlock], [thisHardfork, thisBlock]) =>
      thisBlock > highestBlock && thisBlock <= blockNumber
        ? [thisHardfork, thisBlock]
        : [highestHardfork, highestBlock]
  );
  if (hardfork === undefined || blockNumber < activationBlock) {
    throw new InternalError(
      `Could not find a hardfork to run for block ${blockNumber.toString()}, after having looked for one in the HardhatNode's hardfork activation history, which was: ${JSON.stringify(
        hardforkHistory
      )}. For more information, see https://hardhat.org/hardhat-network/reference/#config`
    );
  }

  if (!HARDHAT_NETWORK_SUPPORTED_HARDFORKS.includes(hardfork)) {
    throw new InternalError(
      `Tried to run a call or transaction in the context of a block whose hardfork is "${hardfork}", but Hardhat Network only supports the following hardforks: ${HARDHAT_NETWORK_SUPPORTED_HARDFORKS.join(
        ", "
      )}`
    );
  }

  return hardfork;
}

export function validateHardforks(
  forkBlockNumber: number | undefined,
  common: Common,
  remoteChainId: number
): void {
  if (!common.gteHardfork("spuriousDragon")) {
    throw new InternalError(
      `Invalid hardfork selected in Hardhat Network's config.

The hardfork must be at least spuriousDragon, but ${common.hardfork()} was given.`
    );
  }

  if (forkBlockNumber !== undefined) {
    let upstreamCommon: Common;
    try {
      upstreamCommon = new Common({ chain: remoteChainId });
    } catch {
      // If ethereumjs doesn't have a common it will throw and we won't have
      // info about the activation block of each hardfork, so we don't run
      // this validation.
      return;
    }

    upstreamCommon.setHardforkByBlockNumber(forkBlockNumber);

    if (!upstreamCommon.gteHardfork("spuriousDragon")) {
      throw new InternalError(
        `Cannot fork ${upstreamCommon.chainName()} from block ${forkBlockNumber}.

Hardhat Network's forking functionality only works with blocks from at least spuriousDragon.`
      );
    }
  }
}
