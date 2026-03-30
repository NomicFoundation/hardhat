import type { ChainType } from "../../types/network.js";

import {
  OP_CHAIN_TYPE as EDR_OP_CHAIN_TYPE,
  L1_CHAIN_TYPE as EDR_L1_CHAIN_TYPE,
  GENERIC_CHAIN_TYPE as EDR_GENERIC_CHAIN_TYPE,
} from "@nomicfoundation/edr";

import {
  GENERIC_CHAIN_TYPE,
  L1_CHAIN_TYPE,
  OPTIMISM_CHAIN_TYPE,
} from "../constants.js";

export function isSupportedChainType(
  chainType: unknown,
): chainType is ChainType {
  return (
    chainType === GENERIC_CHAIN_TYPE ||
    chainType === L1_CHAIN_TYPE ||
    chainType === OPTIMISM_CHAIN_TYPE
  );
}

export function hardhatChainTypeToEdrChainType(chainType: ChainType): string {
  if (chainType === OPTIMISM_CHAIN_TYPE) {
    return EDR_OP_CHAIN_TYPE;
  }

  if (chainType === L1_CHAIN_TYPE) {
    return EDR_L1_CHAIN_TYPE;
  }

  return EDR_GENERIC_CHAIN_TYPE;
}
