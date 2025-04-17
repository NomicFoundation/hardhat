import type { ChainType } from "../../../../../types/network.js";

import { OPTIMISM_CHAIN_TYPE } from "../../../../constants.js";

export enum L1HardforkName {
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
  CANCUN = "cancun",
}

export enum OpHardforkName {
  BEDROCK = "bedrock",
  REGOLITH = "regolith",
  CANYON = "canyon",
  ECOTONE = "ecotone",
  FJORD = "fjord",
  GRANITE = "granite",
  HOLOCENE = "holocene",
}

const L1_HARDFORK_ORDER = Object.values(L1HardforkName);
const OP_HARDFORK_ORDER = Object.values(OpHardforkName);

export function getHardforks(chainType: ChainType): string[] {
  return chainType === OPTIMISM_CHAIN_TYPE
    ? OP_HARDFORK_ORDER
    : L1_HARDFORK_ORDER;
}

const L1_LATEST_HARDFORK: L1HardforkName =
  L1_HARDFORK_ORDER[L1_HARDFORK_ORDER.length - 1];
const OP_LATEST_HARDFORK: OpHardforkName =
  OP_HARDFORK_ORDER[OP_HARDFORK_ORDER.length - 1];

export function getLatestHardfork(chainType: ChainType): string {
  return chainType === OPTIMISM_CHAIN_TYPE
    ? OP_LATEST_HARDFORK
    : L1_LATEST_HARDFORK;
}

/**
 * Check if `hardforkA` is greater than or equal to `hardforkB`,
 * that is, if it includes all its changes.
 *
 * This function is not type-safe, as it accepts any string as hardfork name.
 * It is the caller's responsibility to ensure that the hardfork names are valid.
 */
export function hardforkGte(
  hardforkA: string,
  hardforkB: string,
  chainType: ChainType,
): boolean {
  return chainType === OPTIMISM_CHAIN_TYPE
    ? opHardforkGte(hardforkA, hardforkB)
    : l1HardforkGte(hardforkA, hardforkB);
}

function opHardforkGte(hardforkA: string, hardforkB: string): boolean {
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  -- Cast is safe, as the function is only called with valid hardfork names. */
  const indexA = OP_HARDFORK_ORDER.indexOf(hardforkA as OpHardforkName);
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  -- Cast is safe, as the function is only called with valid hardfork names. */
  const indexB = OP_HARDFORK_ORDER.indexOf(hardforkB as OpHardforkName);

  return indexA >= indexB;
}

function l1HardforkGte(hardforkA: string, hardforkB: string): boolean {
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  -- Cast is safe, as the function is only called with valid hardfork names. */
  const indexA = L1_HARDFORK_ORDER.indexOf(hardforkA as L1HardforkName);
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  -- Cast is safe, as the function is only called with valid hardfork names. */
  const indexB = L1_HARDFORK_ORDER.indexOf(hardforkB as L1HardforkName);

  return indexA >= indexB;
}

export function isValidHardforkName(
  hardfork: string,
  chainType: ChainType,
): boolean {
  return chainType === OPTIMISM_CHAIN_TYPE
    ? /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      -- Cast is safe, as we're validating the hardfork name. */
      OP_HARDFORK_ORDER.includes(hardfork as OpHardforkName)
    : /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      -- Cast is safe, as we're validating the hardfork name. */
      L1_HARDFORK_ORDER.includes(hardfork as L1HardforkName);
}
