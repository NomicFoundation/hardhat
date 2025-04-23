import type { ContractReturnType } from "@nomicfoundation/hardhat-viem/types";
import type { Abi, ContractEventName } from "viem";

export interface HardhatViemMatchers {
  utils: HardhatViemMatchersUtils;

  balancesHaveChanged: (
    fn: GenericFunction,
    changes: Array<{
      address: `0x${string}`;
      amount: bigint;
    }>,
  ) => Promise<void>;

  emit<const ViemAbi extends Abi | readonly unknown[], ContractName>(
    fn: GenericFunction,
    contract: ContractReturnType<ContractName>,
    eventName: ContractEventName<ViemAbi>,
  ): Promise<void>;

  emitWithArgs<const ViemAbi extends Abi | readonly unknown[], ContractName>(
    fn: GenericFunction,
    contract: ContractReturnType<ContractName>,
    eventName: ContractEventName<ViemAbi>,
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
