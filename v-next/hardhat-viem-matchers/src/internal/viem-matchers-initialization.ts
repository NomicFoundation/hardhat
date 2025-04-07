import type { GenericFunction, HardhatViemMatchers, Prefix } from "../types.js";
import type { HardhatViemHelpers } from "@nomicfoundation/hardhat-viem/types";
import type { ChainType } from "hardhat/types/network";

import { changeEtherBalance } from "./matchers/change-ether-balance.js";

export async function initializeViemMatchers<
  ChainTypeT extends ChainType | string,
>(
  viem: HardhatViemHelpers<ChainTypeT>,
): Promise<HardhatViemMatchers<ChainTypeT>> {
  return new HardhatViemMatchersImpl(viem);
}

class HardhatViemMatchersImpl<ChainTypeT extends ChainType | string>
  implements HardhatViemMatchers
{
  readonly #viem: HardhatViemHelpers<ChainTypeT>;

  constructor(viem: HardhatViemHelpers<ChainTypeT>) {
    this.#viem = viem;
  }

  public expect(fn: GenericFunction): Prefix {
    return {
      to: {
        changeEtherBalance: async (address: string, amount: bigint) => {
          return changeEtherBalance(this.#viem, fn, address, amount);
        },
      },
    };
  }
}
