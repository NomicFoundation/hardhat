import type { AbiHolder, ErrorArgsOf, EventArgsOf } from "../abi-types.js";
import type { HardhatViemAssertions } from "../types.js";
import type { balancesHaveChanged as balancesHaveChangedT } from "./assertions/balances-have-changed.js";
import type { emitWithArgs as emitWithArgsT } from "./assertions/emit/emit-with-args.js";
import type { emit as emitT } from "./assertions/emit/emit.js";
import type { revertWithCustomErrorWithArgs as revertWithCustomErrorWithArgsT } from "./assertions/revert/revert-with-custom-error-with-args.js";
import type { revertWithCustomError as revertWithCustomErrorT } from "./assertions/revert/revert-with-custom-error.js";
import type { revertWith as revertWithT } from "./assertions/revert/revert-with.js";
import type { revert as revertT } from "./assertions/revert/revert.js";
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

let balancesHaveChanged: typeof balancesHaveChangedT | undefined;
let emit: typeof emitT | undefined;
let emitWithArgs: typeof emitWithArgsT | undefined;
let revert: typeof revertT | undefined;
let revertWith: typeof revertWithT | undefined;
let revertWithCustomError: typeof revertWithCustomErrorT | undefined;
let revertWithCustomErrorWithArgs:
  | typeof revertWithCustomErrorWithArgsT
  | undefined;

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
    if (balancesHaveChanged === undefined) {
      ({ balancesHaveChanged } = await import(
        "./assertions/balances-have-changed.js"
      ));
    }

    return await balancesHaveChanged(this.#viem, resolvedTxHash, changes);
  }

  public async emit<TContract extends AbiHolder<Abi>>(
    contractFn: Promise<ReadContractReturnType | WriteContractReturnType>,
    contract: TContract,
    eventName: ContractEventName<TContract["abi"]>,
  ): Promise<void> {
    if (emit === undefined) {
      ({ emit } = await import("./assertions/emit/emit.js"));
    }

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
    if (emitWithArgs === undefined) {
      ({ emitWithArgs } = await import("./assertions/emit/emit-with-args.js"));
    }

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
    if (revert === undefined) {
      ({ revert } = await import("./assertions/revert/revert.js"));
    }

    return await revert(contractFn);
  }

  public async revertWith(
    contractFn: Promise<ReadContractReturnType | WriteContractReturnType>,
    expectedRevertReason: string,
  ): Promise<void> {
    if (revertWith === undefined) {
      ({ revertWith } = await import("./assertions/revert/revert-with.js"));
    }

    return await revertWith(contractFn, expectedRevertReason);
  }

  public async revertWithCustomError<TContract extends AbiHolder<Abi>>(
    contractFn: Promise<ReadContractReturnType | WriteContractReturnType>,
    contract: TContract,
    customErrorName: ContractErrorName<TContract["abi"]>,
  ): Promise<void> {
    if (revertWithCustomError === undefined) {
      ({ revertWithCustomError } = await import(
        "./assertions/revert/revert-with-custom-error.js"
      ));
    }

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
    if (revertWithCustomErrorWithArgs === undefined) {
      ({ revertWithCustomErrorWithArgs } = await import(
        "./assertions/revert/revert-with-custom-error-with-args.js"
      ));
    }

    return await revertWithCustomErrorWithArgs(
      contractFn,
      contract,
      customErrorName,
      args,
    );
  }
}
