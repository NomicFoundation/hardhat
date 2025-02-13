import type { ChainType } from "../../../../../types/network.js";

import {
  GENERIC_CHAIN_TYPE,
  L1_CHAIN_TYPE,
  OPTIMISM_CHAIN_TYPE,
} from "../../../../constants.js";

export function isEdrSupportedChainType(
  chainType: unknown,
): chainType is ChainType {
  return (
    chainType === GENERIC_CHAIN_TYPE ||
    chainType === L1_CHAIN_TYPE ||
    chainType === OPTIMISM_CHAIN_TYPE
  );
}
