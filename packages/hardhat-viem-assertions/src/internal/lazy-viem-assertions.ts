import type * as ViemAssertionsModule from "./viem-assertions.js";
import type { AbiHolder, ErrorArgsOf, EventArgsOf } from "../abi-types.js";
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

import { bindAllMethods } from "@nomicfoundation/hardhat-utils/lang";

let HardhatViemAssertionsImpl:
  | typeof ViemAssertionsModule.HardhatViemAssertionsImpl
  | undefined;

/**
 * The assertion implementation is loaded with a dynamic import, so a promise
 * passed to an assertion (e.g. a reverting contract call) may reject before
 * the implementation attaches its own handlers to it. That rejection would be
 * reported as an unhandled one, despite being handled as soon as the import
 * resolves. To avoid this, the wrapper settles the promise before loading the
 * implementation. It uses `await` to preserve the async stack trace.
 */
async function settleBeforeLazyImport(value: unknown): Promise<void> {
  try {
    await value;
  } catch {
    // The rejection is handled by the assertion implementation, which awaits
    // the same, now settled, promise.
  }
}

export class LazyHardhatViemAssertions<
  ChainTypeT extends ChainType | string = "generic",
> implements HardhatViemAssertions
{
  readonly #viem: HardhatViemHelpers<ChainTypeT>;
  #impl: ViemAssertionsModule.HardhatViemAssertionsImpl<ChainTypeT> | undefined;

  constructor(viem: HardhatViemHelpers<ChainTypeT>) {
    this.#viem = viem;
    bindAllMethods(this);
  }

  public async balancesHaveChanged(
    txHash: Hash | Promise<Hash>,
    changes: Array<{
      address: Address;
      amount: bigint;
    }>,
  ): Promise<void> {
    await settleBeforeLazyImport(txHash);
    const impl = await this.#getImpl();
    return await impl.balancesHaveChanged(txHash, changes);
  }

  public async emit<TContract extends AbiHolder<Abi>>(
    txHash: Hash | Promise<Hash>,
    contract: TContract,
    eventName: ContractEventName<TContract["abi"]>,
  ): Promise<void> {
    await settleBeforeLazyImport(txHash);
    const impl = await this.#getImpl();
    return await impl.emit(txHash, contract, eventName);
  }

  public async emitWithArgs<
    TContract extends AbiHolder<Abi>,
    TEventName extends ContractEventName<TContract["abi"]>,
  >(
    txHash: Hash | Promise<Hash>,
    contract: TContract,
    eventName: TEventName,
    args: EventArgsOf<TContract["abi"], TEventName>,
  ): Promise<void> {
    await settleBeforeLazyImport(txHash);
    const impl = await this.#getImpl();
    return await impl.emitWithArgs(txHash, contract, eventName, args);
  }

  public async revert(
    contractFn: Promise<ReadContractReturnType | WriteContractReturnType>,
  ): Promise<void> {
    await settleBeforeLazyImport(contractFn);
    const impl = await this.#getImpl();
    return await impl.revert(contractFn);
  }

  public async revertWith(
    contractFn: Promise<ReadContractReturnType | WriteContractReturnType>,
    expectedRevertReason: string,
  ): Promise<void> {
    await settleBeforeLazyImport(contractFn);
    const impl = await this.#getImpl();
    return await impl.revertWith(contractFn, expectedRevertReason);
  }

  public async revertWithCustomError<TContract extends AbiHolder<Abi>>(
    contractFn: Promise<ReadContractReturnType | WriteContractReturnType>,
    contract: TContract,
    customErrorName: ContractErrorName<TContract["abi"]>,
  ): Promise<void> {
    await settleBeforeLazyImport(contractFn);
    const impl = await this.#getImpl();
    return await impl.revertWithCustomError(
      contractFn,
      contract,
      customErrorName,
    );
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
    await settleBeforeLazyImport(contractFn);
    const impl = await this.#getImpl();
    return await impl.revertWithCustomErrorWithArgs(
      contractFn,
      contract,
      customErrorName,
      args,
    );
  }

  async #getImpl(): Promise<
    ViemAssertionsModule.HardhatViemAssertionsImpl<ChainTypeT>
  > {
    if (HardhatViemAssertionsImpl === undefined) {
      ({ HardhatViemAssertionsImpl } = await import("./viem-assertions.js"));
    }

    if (this.#impl === undefined) {
      this.#impl = new HardhatViemAssertionsImpl(this.#viem);
    }

    return this.#impl;
  }
}
