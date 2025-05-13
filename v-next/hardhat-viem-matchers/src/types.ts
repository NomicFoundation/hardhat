import type {
  ContractAbis,
  ContractReturnType,
} from "@nomicfoundation/hardhat-viem/types";
import type {
  Address,
  ContractEventName,
  Hash,
  ReadContractReturnType,
  WriteContractReturnType,
} from "viem";

export interface HardhatViemMatchers {
  utils: HardhatViemMatchersUtils;

  balancesHaveChanged: (
    resolvedTxHash: Promise<Hash>,
    changes: Array<{
      address: Address;
      amount: bigint;
    }>,
  ) => Promise<void>;

  emit<
    ContractName extends CompiledContractName,
    EventName extends ContractName extends keyof ContractAbis
      ? ContractEventName<ContractAbis[ContractName]>
      : string,
  >(
    contractFn: Promise<ReadContractReturnType | WriteContractReturnType>,
    contract: ContractReturnType<ContractName>,
    eventName: EventName,
  ): Promise<void>;

  emitWithArgs<
    ContractName extends CompiledContractName,
    EventName extends ContractName extends keyof ContractAbis
      ? ContractEventName<ContractAbis[ContractName]>
      : string,
  >(
    contractFn: Promise<ReadContractReturnType | WriteContractReturnType>,
    contract: ContractReturnType<ContractName>,
    eventName: EventName,
    args: any[],
  ): Promise<void>;

  revert(
    contractFn: Promise<ReadContractReturnType | WriteContractReturnType>,
  ): Promise<void>;

  revertWith(
    contractFn: Promise<ReadContractReturnType | WriteContractReturnType>,
    expectedReason: string,
  ): Promise<void>;

  revertWithCustomError<ContractName extends CompiledContractName>(
    contractFn: Promise<ReadContractReturnType | WriteContractReturnType>,
    contract: ContractReturnType<ContractName>,
    customErrorName: string,
  ): Promise<void>;

  revertWithCustomErrorWithArgs<ContractName extends CompiledContractName>(
    contractFn: Promise<ReadContractReturnType | WriteContractReturnType>,
    contract: ContractReturnType<ContractName>,
    customErrorName: string,
    args: any[],
  ): Promise<void>;
}

export interface HardhatViemMatchersUtils {
  areApproximatelyEqual(n1: bigint, n2: bigint, variance: bigint): void;
  properAddress: (address: string) => void;
  properChecksumAddress: (address: string) => Promise<void>;
}

type CompiledContractName = [keyof ContractAbis] extends [never]
  ? string
  : keyof ContractAbis;
