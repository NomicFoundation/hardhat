import type { GenericFunction, HardhatViemMatchers } from "../types.js";
import type { HardhatViemHelpers } from "@nomicfoundation/hardhat-viem/types";

import { balancesHaveChanged } from "./matchers/balances-have-changed.js";

export class HardhatViemMatchersImpl implements HardhatViemMatchers {
  readonly #viem: HardhatViemHelpers;

  constructor(viem: HardhatViemHelpers) {
    this.#viem = viem;
  }

  public async balancesHaveChanged(
    fn: GenericFunction,
    changes: Array<{
      address: `0x${string}`;
      amount: bigint;
    }>,
  ): Promise<void> {
    return balancesHaveChanged(this.#viem, fn, changes);
  }
}
