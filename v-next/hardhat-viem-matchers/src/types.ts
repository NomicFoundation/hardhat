import type {
  ContractAbis,
  ContractReturnType,
} from "@nomicfoundation/hardhat-viem/types";
import type { ContractEventName } from "viem";

export interface HardhatViemMatchers {
  utils: HardhatViemMatchersUtils;

  balancesHaveChanged: (
    fn: GenericFunction,
    changes: Array<{
      address: `0x${string}`;
      amount: bigint;
    }>,
  ) => Promise<void>;

  emit<
    ContractName extends CompiledContractName,
    EventName extends ContractName extends keyof ContractAbis
      ? ContractEventName<ContractAbis[ContractName]>
      : string,
  >(
    fn: GenericFunction,
    contract: ContractReturnType<ContractName>,
    eventName: EventName,
  ): Promise<void>;

  emitWithArgs<
    ContractName extends CompiledContractName,
    EventName extends ContractName extends keyof ContractAbis
      ? ContractEventName<ContractAbis[ContractName]>
      : string,
  >(
    fn: GenericFunction,
    contract: ContractReturnType<ContractName>,
    eventName: EventName,
    args: any[],
  ): Promise<void>;

  revert(fn: GenericFunction): Promise<void>;

  revertWith(fn: GenericFunction, expectedReason: string): Promise<void>;
}

export interface HardhatViemMatchersUtils {
  areApproximatelyEqual(n1: bigint, n2: bigint, variance: bigint): void;
  properAddress: (address: string) => void;
  properChecksumAddress: (address: string) => Promise<void>;
}

export type GenericFunction = () => Promise<any>;

type CompiledContractName = [keyof ContractAbis] extends [never]
  ? string
  : keyof ContractAbis;
