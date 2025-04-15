import type {
  GenericFunction,
  HardhatViemMatchers,
  HardhatViemMatchersUtils,
} from "../types.js";
import type {
  ContractReturnType,
  HardhatViemHelpers,
} from "@nomicfoundation/hardhat-viem/types";
import type { Abi, ContractEventName } from "viem";

import { balancesHaveChanged } from "./matchers/balances-have-changed.js";
import { emit, emitWithArgs } from "./matchers/emit.js";
import { HardhatViemMatchersUtilsImpl } from "./viem-matchers-utils.js";

export class HardhatViemMatchersImpl implements HardhatViemMatchers {
  readonly #viem: HardhatViemHelpers;

  public readonly utils: HardhatViemMatchersUtils;

  constructor(viem: HardhatViemHelpers) {
    this.#viem = viem;
    this.utils = new HardhatViemMatchersUtilsImpl();
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

  public async emit<
    // eslint-disable-next-line @typescript-eslint/naming-convention -- TODO
    const abi extends Abi | readonly unknown[],
    ContractName,
  >(
    fn: GenericFunction,
    contract: ContractReturnType<ContractName>,
    eventName: ContractEventName<abi>,
  ): Promise<void> {
    return emit(this.#viem, fn, contract, eventName);
  }

  public async emitWithArgs<
    // eslint-disable-next-line @typescript-eslint/naming-convention -- TODO
    const abi extends Abi | readonly unknown[],
    ContractName,
  >(
    fn: GenericFunction,
    contract: ContractReturnType<ContractName>,
    eventName: ContractEventName<abi>,
    args: any[],
  ): Promise<void> {
    return emitWithArgs(this.#viem, fn, contract, eventName, args);
  }
}
