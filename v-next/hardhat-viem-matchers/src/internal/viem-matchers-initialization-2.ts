import type { GenericFunction, HardhatViemMatchers2 } from "../types.js";
import type { HardhatViemHelpers } from "@nomicfoundation/hardhat-viem/types";

import { balanceShouldChange } from "./matchers/balance-should-change.js";

export async function initializeViemMatchers2(
  viem: HardhatViemHelpers,
): Promise<HardhatViemMatchers2> {
  return new HardhatViemMatchersImpl(viem);
}

class HardhatViemMatchersImpl implements HardhatViemMatchers2 {
  readonly #viem: HardhatViemHelpers;

  constructor(viem: HardhatViemHelpers) {
    this.#viem = viem;
  }

  public async balanceShouldChange(
    fn: GenericFunction,
    address: string,
    amount: bigint,
  ): Promise<void> {
    return balanceShouldChange(this.#viem, fn, address, amount);
  }
}
