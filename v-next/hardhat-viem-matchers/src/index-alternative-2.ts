import type { GenericFunction } from "./types.js";
import type { HardhatViemHelpers } from "@nomicfoundation/hardhat-viem/types";
import type { ChainType } from "hardhat/types/network";

import { changeEtherBalance } from "./internal/matchers/change-ether-balance.js";

export function viemExpect<ChainTypeT extends ChainType | string>(
  fn: GenericFunction,
) {
  return {
    to: {
      changeEtherBalance: async (
        viem: HardhatViemHelpers<ChainTypeT>,
        address: string,
        amount: bigint,
      ): Promise<void> => {
        return changeEtherBalance(viem, fn, address, amount);
      },
    },
  };
}
