import type { ContractReturnType } from "@nomicfoundation/hardhat-viem/types";
import type { Abi, ContractEventName } from "viem";

export interface HardhatViemMatchers {
  utils: HardhatViemMatchersUtils;

  balancesHaveChanged: (
    fn: GenericFunction,
    changes: Array<{
      address: `0x${string}`; // TODO: create a type?
      amount: bigint;
    }>,
  ) => Promise<void>;

  emit<
    // eslint-disable-next-line @typescript-eslint/naming-convention -- TODO
    const abi extends Abi | readonly unknown[],
    ContractName,
  >(
    fn: GenericFunction,
    contract: ContractReturnType<ContractName>,
    eventName: ContractEventName<abi>,
  ): Promise<void>;

  emitWithArgs<
    // eslint-disable-next-line @typescript-eslint/naming-convention -- TODO
    const abi extends Abi | readonly unknown[],
    ContractName,
  >(
    fn: GenericFunction,
    contract: ContractReturnType<ContractName>,
    eventName: ContractEventName<abi>,
    args: any[],
  ): Promise<void>;
}

export interface HardhatViemMatchersUtils {
  areApproximatelyEqual(n1: bigint, n2: bigint, variance: bigint): void;
  properAddress: (address: string) => void;
  properChecksumAddress: (address: string) => Promise<void>;
}

export type GenericFunction = () => Promise<any>;
