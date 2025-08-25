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

/**
 * Ethereum-specific test assertions that integrate with viem.
 *
 * These assertions help validate: reverted transactions, emitted events, and
 * ether balance changes in a test-friendly way.
 */
export interface HardhatViemAssertions {
  /**
   * Assert that a transaction changes the ether balance of the given addresses by the specified amounts.
   *
   * The comparison is made between the block immediately before the transaction and the transaction's block.
   * For the transaction sender, the effective gas fee is accounted for so the expected amount reflects the
   * pure value transfer effect.
   *
   * @param resolvedTxHash - A promise that resolves to the transaction hash returned by `sendTransaction`.
   * @param changes - The expected balance deltas, in wei, for each address. Negative values are allowed.
   */
  balancesHaveChanged: (
    resolvedTxHash: Promise<Hash>,
    changes: Array<{
      address: Address;
      amount: bigint;
    }>,
  ) => Promise<void>;

  /**
   * Assert that executing a contract function emits a specific event.
   *
   * The function is awaited, then logs are fetched for the contract address and parsed
   * against the contract ABI for the given event name. The assertion passes if at least one
   * matching event is found.
   *
   * @typeParam ContractName - The contract name associated with the `contract` instance.
   * @typeParam EventName - The name of the event to check.
   * @param contractFn - A promise returned by a viem read or write contract call.
   * @param contract - The viem contract instance whose ABI is used to parse logs.
   * @param eventName - The event name to assert.
   */
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

  /**
   * Assert that executing a contract function emits a specific event with the given arguments.
   *
   * Arguments are matched positionally in the same order as defined in the event's ABI. You can pass
   * predicate functions in the `args` array to perform specific checks, or use the `anyValue` predicate
   * to match any value.
   *
   * @typeParam ContractName - The contract name associated with the `contract` instance.
   * @typeParam EventName - The name of the event to check.
   * @param contractFn - A promise returned by a viem read or write contract call.
   * @param contract - The viem contract instance whose ABI is used to parse logs.
   * @param eventName - The event name to assert.
   * @param args - Expected event arguments. Each item can be a concrete value or a predicate function `(value) => boolean`.
   */
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

  /**
   * Assert that executing a contract function reverts for any reason, without checking the cause of the revert.
   *
   * @param contractFn - A promise returned by a viem read or write contract call expected to revert.
   */
  revert(
    contractFn: Promise<ReadContractReturnType | WriteContractReturnType>,
  ): Promise<void>;

  /**
   * Assert that executing a contract function reverts with the specified reason string.
   *
   * @param contractFn - A promise returned by a viem read or write contract call expected to revert.
   * @param expectedRevertReason - The expected revert reason string.
   */
  revertWith(
    contractFn: Promise<ReadContractReturnType | WriteContractReturnType>,
    expectedRevertReason: string,
  ): Promise<void>;

  /**
   * Assert that executing a contract function reverts with a specific custom error defined in the given contract.
   *
   * The contract's ABI is used to decode the revert data and validate the error name.
   *
   * @typeParam ContractName - The contract name associated with the `contract` instance.
   * @param contractFn - A promise returned by a viem read or write contract call expected to revert.
   * @param contract - The viem contract instance whose ABI defines the expected custom error.
   * @param customErrorName - The expected custom error name.
   */
  revertWithCustomError<ContractName extends CompiledContractName>(
    contractFn: Promise<ReadContractReturnType | WriteContractReturnType>,
    contract: ContractReturnType<ContractName>,
    customErrorName: string,
  ): Promise<void>;

  /**
   * Assert that executing a contract function reverts with a specific custom error and arguments.
   *
   * Arguments are matched positionally in the same order as defined in the error's ABI. Each expected argument
   * can be a concrete value or a predicate function to perform specific checks. You can also use the `anyValue`
   * predicate to match any value.
   *
   * @typeParam ContractName - The contract name associated with the `contract` instance.
   * @param contractFn - A promise returned by a viem read or write contract call expected to revert.
   * @param contract - The viem contract instance whose ABI defines the expected custom error.
   * @param customErrorName - The expected custom error name.
   * @param args - Expected custom error arguments. Each item can be a concrete value or a predicate function `(value) => boolean`.
   */
  revertWithCustomErrorWithArgs<ContractName extends CompiledContractName>(
    contractFn: Promise<ReadContractReturnType | WriteContractReturnType>,
    contract: ContractReturnType<ContractName>,
    customErrorName: string,
    args: any[],
  ): Promise<void>;
}

type CompiledContractName = [keyof ContractAbis] extends [never]
  ? string
  : keyof ContractAbis;
