import type { HardhatViemAssertions } from "../types.js";
import type {
  ContractAbis,
  ContractReturnType,
  HardhatViemHelpers,
} from "@nomicfoundation/hardhat-viem/types";
import type { ChainType } from "hardhat/types/network";
import type {
  Address,
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
    return balancesHaveChanged(this.#viem, resolvedTxHash, changes);
  }

  public async emit<
    ContractName extends keyof ContractAbis,
    EventName extends ContractEventName<ContractAbis[ContractName]>,
  >(
    contractFn: Promise<ReadContractReturnType | WriteContractReturnType>,
    contract: ContractReturnType<ContractName>,
    eventName: EventName,
  ): Promise<void> {
    return emit(this.#viem, contractFn, contract, eventName);
  }

  public async emitWithArgs<
    ContractName extends keyof ContractAbis,
    EventName extends ContractEventName<ContractAbis[ContractName]>,
  >(
    contractFn: Promise<ReadContractReturnType | WriteContractReturnType>,
    contract: ContractReturnType<ContractName>,
    eventName: EventName,
    args: any[],
  ): Promise<void> {
    return emitWithArgs(this.#viem, contractFn, contract, eventName, args);
  }

  public async revert(
    contractFn: Promise<ReadContractReturnType | WriteContractReturnType>,
  ): Promise<void> {
    return revert(contractFn);
  }

  public async revertWith(
    contractFn: Promise<ReadContractReturnType | WriteContractReturnType>,
    expectedRevertReason: string,
  ): Promise<void> {
    return revertWith(contractFn, expectedRevertReason);
  }

  public async revertWithCustomError<ContractName extends keyof ContractAbis>(
    contractFn: Promise<ReadContractReturnType | WriteContractReturnType>,
    contract: ContractReturnType<ContractName>,
    customErrorName: string,
  ): Promise<void> {
    return revertWithCustomError(contractFn, contract, customErrorName);
  }

  public async revertWithCustomErrorWithArgs<
    ContractName extends keyof ContractAbis,
  >(
    contractFn: Promise<ReadContractReturnType | WriteContractReturnType>,
    contract: ContractReturnType<ContractName>,
    customErrorName: string,
    args: any[],
  ): Promise<void> {
    return revertWithCustomErrorWithArgs(
      contractFn,
      contract,
      customErrorName,
      args,
    );
  }
}
