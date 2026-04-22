import type { ChainType } from "../../../../../types/network.js";

import { l1HardforkLatest, opLatestHardfork } from "@nomicfoundation/edr";

import { OPTIMISM_CHAIN_TYPE } from "../../../../constants.js";

import {
  edrL1HardforkToHardhatL1HardforkName,
  edrOpHardforkToHardhatOpHardforkName,
} from "./convert-to-edr.js";

// Lives in its own file so that consumers of the hardfork enums and ordering in
// hardfork.ts don't transitively load @nomicfoundation/edr (a native addon) and
// the edr<->hardhat conversion helpers just to reference a type.
export function getCurrentHardfork(chainType: ChainType): string {
  return chainType === OPTIMISM_CHAIN_TYPE
    ? edrOpHardforkToHardhatOpHardforkName(opLatestHardfork())
    : edrL1HardforkToHardhatL1HardforkName(l1HardforkLatest());
}
