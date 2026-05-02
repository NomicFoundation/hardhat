import type { AbiHolder, ErrorArgsOf, EventArgsOf } from "./abi-types.js";
import type { HardhatViemAssertions } from "../types.js";
import type { HardhatViemHelpers } from "@nomicfoundation/hardhat-viem/types";
import type { ChainType } from "hardhat/types/network";
import type {
  Abi,
  Address,
  ContractErrorName,
  ContractEventName,
  Hash,
  ReadContractReturnType,
  WriteContractReturnType,
} from "viem";

import { balancesHaveChanged } from "./assertions/balances-have-changed.js";
import { emitWithArgs } from "./assertions/emit/emit-with-args.js";
import { emit } from "./assertions/emit/emit.js";
import { revertWithCustomErrorWithArgs } from "./assertions/revert/revert-with-custom-error-with-args.js";
import { revertWithCustomError } from "./assertions/revert/revert-with-custom-error.js";
import { revertWith } from "./assertions/revert/revert-with.js";
import { revert } from "./assertions/revert/revert.js";

export class HardhatViemAssertionsImpl<
  ChainTypeT extends ChainType | string = "generic",
> implements HardhatViemAssertions
{
  readonly #viem: HardhatViemHelpers<ChainTypeT>;

  constructor(viem: HardhatViemHelpers<ChainTypeT>) {
    this.#viem = viem;
  }

  public async balancesHaveChanged(
    resolvedTxHash: Promise<Hash>,
    changes: Array<{
      address: Address;
      amount: bigint;
    }>,
  ): Promise<void> {
    return await balancesHaveChanged(this.#viem, resolvedTxHash, changes);
  }

  public async emit<TContract extends AbiHolder<Abi>>(
    contractFn: Promise<ReadContractReturnType | WriteContractReturnType>,
    contract: TContract,
    eventName: ContractEventName<TContract["abi"]>,
  ): Promise<void> {
    return await emit(this.#viem, contractFn, contract, eventName);
  }

  public async emitWithArgs<
    TContract extends AbiHolder<Abi>,
    TEventName extends ContractEventName<TContract["abi"]>,
  >(
    contractFn: Promise<ReadContractReturnType | WriteContractReturnType>,
    contract: TContract,
    eventName: TEventName,
    args: EventArgsOf<TContract["abi"], TEventName>,
  ): Promise<void> {
    return await emitWithArgs(
      this.#viem,
      contractFn,
      contract,
      eventName,
      args,
    );
  }

  public async revert(
    contractFn: Promise<ReadContractReturnType | WriteContractReturnType>,
  ): Promise<void> {
    return await revert(contractFn);
  }

  public async revertWith(
    contractFn: Promise<ReadContractReturnType | WriteContractReturnType>,
    expectedRevertReason: string,
  ): Promise<void> {
    return await revertWith(contractFn, expectedRevertReason);
  }

  public async revertWithCustomError<TContract extends AbiHolder<Abi>>(
    contractFn: Promise<ReadContractReturnType | WriteContractReturnType>,
    contract: TContract,
    customErrorName: ContractErrorName<TContract["abi"]>,
  ): Promise<void> {
    return await revertWithCustomError(contractFn, contract, customErrorName);
  }

  public async revertWithCustomErrorWithArgs<
    TContract extends AbiHolder<Abi>,
    TErrorName extends ContractErrorName<TContract["abi"]>,
  >(
    contractFn: Promise<ReadContractReturnType | WriteContractReturnType>,
    contract: TContract,
    customErrorName: TErrorName,
    args: ErrorArgsOf<TContract["abi"], TErrorName>,
  ): Promise<void> {
    return await revertWithCustomErrorWithArgs(
      contractFn,
      contract,
      customErrorName,
      args,
    );
  }
}
