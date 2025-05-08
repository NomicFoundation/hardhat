import type {
  HardhatViemMatchers,
  HardhatViemMatchersUtils,
} from "../types.js";
import type {
  ContractAbis,
  ContractReturnType,
  HardhatViemHelpers,
} from "@nomicfoundation/hardhat-viem/types";
import type { ChainType } from "hardhat/types/network";
import type {
  ContractEventName,
  ReadContractReturnType,
  WriteContractReturnType,
} from "viem";

import { balancesHaveChanged } from "./matchers/balances-have-changed.js";
import { emitWithArgs } from "./matchers/emit/emit-with-args.js";
import { emit } from "./matchers/emit/emit.js";
import { revertWithCustomErrorWithArgs } from "./matchers/revert/revert-with-custom-error-with-args.js";
import { revertWithCustomError } from "./matchers/revert/revert-with-custom-error.js";
import { revertWith } from "./matchers/revert/revert-with.js";
import { revert } from "./matchers/revert/revert.js";
import { HardhatViemMatchersUtilsImpl } from "./viem-matchers-utils.js";

export class HardhatViemMatchersImpl<
  ChainTypeT extends ChainType | string = "generic",
> implements HardhatViemMatchers
{
  readonly #viem: HardhatViemHelpers<ChainTypeT>;

  public readonly utils: HardhatViemMatchersUtils;

  constructor(viem: HardhatViemHelpers<ChainTypeT>) {
    this.#viem = viem;
    this.utils = new HardhatViemMatchersUtilsImpl();
  }

  public async balancesHaveChanged(
    promise: Promise<`0x${string}`>,
    changes: Array<{
      address: `0x${string}`;
      amount: bigint;
    }>,
  ): Promise<void> {
    return balancesHaveChanged(this.#viem, promise, changes);
  }

  public async emit<
    ContractName extends keyof ContractAbis,
    EventName extends ContractEventName<ContractAbis[ContractName]>,
  >(
    promise: Promise<ReadContractReturnType | WriteContractReturnType>,
    contract: ContractReturnType<ContractName>,
    eventName: EventName,
  ): Promise<void> {
    return emit(this.#viem, promise, contract, eventName);
  }

  public async emitWithArgs<
    ContractName extends keyof ContractAbis,
    EventName extends ContractEventName<ContractAbis[ContractName]>,
  >(
    promise: Promise<ReadContractReturnType | WriteContractReturnType>,
    contract: ContractReturnType<ContractName>,
    eventName: EventName,
    args: any[],
  ): Promise<void> {
    return emitWithArgs(this.#viem, promise, contract, eventName, args);
  }

  public async revert(
    promise: Promise<ReadContractReturnType | WriteContractReturnType>,
  ): Promise<void> {
    return revert(promise);
  }

  public async revertWith(
    promise: Promise<ReadContractReturnType | WriteContractReturnType>,
    expectedReason: string,
  ): Promise<void> {
    return revertWith(promise, expectedReason);
  }

  public async revertWithCustomError<ContractName extends keyof ContractAbis>(
    promise: Promise<ReadContractReturnType | WriteContractReturnType>,
    contract: ContractReturnType<ContractName>,
    customErrorName: string,
  ): Promise<void> {
    return revertWithCustomError(promise, contract, customErrorName);
  }

  public async revertWithCustomErrorWithArgs<
    ContractName extends keyof ContractAbis,
  >(
    promise: Promise<ReadContractReturnType | WriteContractReturnType>,
    contract: ContractReturnType<ContractName>,
    customErrorName: string,
    args: any[],
  ): Promise<void> {
    return revertWithCustomErrorWithArgs(
      promise,
      contract,
      customErrorName,
      args,
    );
  }
}
