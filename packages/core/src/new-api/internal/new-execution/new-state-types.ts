import { type } from "os";
import { FutureType, SolidityParameterType } from "../../types/module";

export interface RawStaticCallResult {
  returnData: string;
  success: boolean;
  customErrorReported: boolean;
}

/**
 * A list of (possibly named) values returned by a function, or used as
 * arguments for a custom error.
 */
export interface EvmValues {
  /**
   * The values in defintion order.
   */
  positional: SolidityParameterType[];

  /**
   * A mapping from the return/param name to their value.
   *
   * Note that not every value will be named, so this mapping may
   * have less values than the `positional` array.
   */
  named: Record<string, SolidityParameterType>;
}

/**
 * The result of executing a contract function/constructor.
 */
export type EvmExecutionResult =
  | SuccessfulEvmExecutionResult
  | FailedEvmExecutionResult;

/**
 * The result of executing a contract function/constructor that failed.
 */
export type FailedEvmExecutionResult =
  | InvalidResultError
  | RevertWithoutReason
  | RevertWithReason
  | RevertWithPanicCode
  | RevertWithCustomError
  | RevertWithUnknownCustomError
  | RevertWithInvalidData
  | RevertWithInvalidDataOrUnknownCustomError;

/**
 * Each of the possible execution results that Ignition can handle.
 */
export enum EvmExecutionResultTypes {
  SUCESSFUL_RESULT = "SUCESSFUL_RESULT",
  INVALID_RESULT_ERROR = "INVALID_RESULT_ERROR",
  REVERT_WITHOUT_REASON = "REVERT_WITHOUT_REASON",
  REVERT_WITH_REASON = "REVERT_WITH_REASON",
  REVERT_WITH_PANIC_CODE = "REVERT_WITH_PANIC_CODE",
  REVERT_WITH_CUSTOM_ERROR = "REVERT_WITH_CUSTOM_ERROR",
  REVERT_WITH_UNKNOWN_CUSTOM_ERROR = "REVERT_WITH_UNKNOWN_CUSTOM_ERROR",
  REVERT_WITH_INVALID_DATA = "REVERT_WITH_INVALID_DATA",
  REVERT_WITH_INVALID_DATA_OR_UNKNOWN_CUSTOM_ERROR = "REVERT_WITH_INVALID_DATA_OR_UNKNOWN_CUSTOM_ERROR",
}

/**
 * The results returned by Solidity either as a function result, or as
 * custom error parameters.
 */
export interface SuccessfulEvmExecutionResult {
  type: EvmExecutionResultTypes.SUCESSFUL_RESULT;

  /**
   * The values returned by the execution.
   */
  values: EvmValues;
}

/**
 * The execution was seemgly succseful, but the data returned by it was invalid.
 */
export interface InvalidResultError {
  type: EvmExecutionResultTypes.INVALID_RESULT_ERROR;
  data: string;
}

/**
 * The execution reverted without a reason string nor any other kind of error.
 */
export interface RevertWithoutReason {
  type: EvmExecutionResultTypes.REVERT_WITHOUT_REASON;
}

/**
 * The execution reverted with a reason string by calling `revert("reason")`.
 */
export interface RevertWithReason {
  type: EvmExecutionResultTypes.REVERT_WITH_REASON;
  message: string;
}

/**
 * The execution reverted with a panic code due to some error that solc handled.
 */
export interface RevertWithPanicCode {
  type: EvmExecutionResultTypes.REVERT_WITH_PANIC_CODE;
  panicCode: number;
  panicName: string;
}

/**
 * The execution reverted with a custom error that was defined by the contract.
 */
export interface RevertWithCustomError {
  type: EvmExecutionResultTypes.REVERT_WITH_CUSTOM_ERROR;
  errorName: string;
  args: EvmValues;
}

/**
 * This error is used when the JSON-RPC server indicated that the error was due to
 * a custom error, yet Ignition can't decode its data.
 *
 * Note that this only happens in development networks like Hardhat Network. They
 * can recognize that the data they are returning is a custom error, and inform that
 * to the user.
 *
 * We could treat this situation as RevertWithInvalidDataOrUnknownCustomError but
 * that would be loosing information.
 */
export interface RevertWithUnknownCustomError {
  type: EvmExecutionResultTypes.REVERT_WITH_UNKNOWN_CUSTOM_ERROR;
  signature: string;
  data: string;
}

/**
 * The execution failed due to some error whose kind we can recognize, but that
 * we can't decode becase its data is invalid. This happens when the ABI decoding
 * of the error fails, or when a panic code is invalid.
 */
export interface RevertWithInvalidData {
  type: EvmExecutionResultTypes.REVERT_WITH_INVALID_DATA;
  data: string;
}

/**
 * If this error is returned the execution either returned completely invalid/unrecognizable
 * data, or a custom error that we can't recognize and the JSON-RPC server can't recognize either.
 */
export interface RevertWithInvalidDataOrUnknownCustomError {
  type: EvmExecutionResultTypes.REVERT_WITH_INVALID_DATA_OR_UNKNOWN_CUSTOM_ERROR;
  signature: string;
  data: string;
}

/**
 * The relevant subset of a transaction log, as returned by eth_getTransactionReceipt.
 */
export interface TransactionLog {
  address: string;
  logIndex: string;
  data: string;
  topics: string[];
}

/**
 * The status of a transaction, as represented in its receipt.
 */
export enum TransactionReceiptStatus {
  FAILURE = 0,
  SUCCESS = 1,
}

/**
 * The relevant subset of the receipt, as returned by eth_getTransactionReceipt.
 */
export interface TransactionReceipt {
  contractAddress: string | null;
  status: TransactionReceiptStatus;
  logs: TransactionLog[];
}

/**
 * This interface represents a transaction that was sent to the network.
 */
export interface Transaction {
  hash: string;

  // We store this data in case we need to bump the transaction fees.
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;

  // Only available after the transaction has confirmed, with enough confirmations.
  receipt?: TransactionReceipt;
}

/**
 * An interaction with an Ethereum network.
 *
 * It can be either an OnchainInteraction or a StaticCall.
 *
 * OnchainInteractions are interactions that need to be executed with a transaction, while
 * StaticCalls are interactions that can be resolved by your local node.
 */
export type NetworkInteraction = OnchainInteraction | StaticCall;

/**
 * The different types of network interactions.
 */
export enum NetworkInteractionType {
  ONCHAIN_INTERACTION = "ONCHAIN_INTERACTION",
  STATIC_CALL = "STATIC_CALL",
}

/**
 * This interface represents an any kind of interaction between Ethereum accounts that
 * needs to be executed onchain.
 **/
export interface OnchainInteraction {
  id: number;
  type: NetworkInteractionType.ONCHAIN_INTERACTION;
  to: string | undefined; // Undefined when it's a deployment transaction
  data: string;
  value: bigint;
  from: string;
  nonce: number;
  transactions: Transaction[];
}

/**
 * This interface represents a static call to the Ethereum network.
 *
 * Note that static calls are always immediately resolved, so their result
 * is always available.
 **/
export interface StaticCall {
  id: number;
  type: NetworkInteractionType.STATIC_CALL;
  to: string | undefined; // Undefined when it's a deployment transaction
  data: string;
  value: bigint;
  from: string;
  result: RawStaticCallResult;
}

export enum ExecutionResultType {
  SUCCESS = "SUCCESS",
  REVERTED_TRANSACTION = "REVERTED_TRANSACTION",
  STATIC_CALL_ERROR = "STATIC_CALL_ERROR",
  SIMULATION_ERROR = "SIMULATION_ERROR",
  STRATEGY_ERROR = "STRATEGY_ERROR",
}

export interface RevertedTransactionExecutionResult {
  type: ExecutionResultType.REVERTED_TRANSACTION;
}

export interface FailedStaticCallExecutionResult {
  type: ExecutionResultType.STATIC_CALL_ERROR;
  error: FailedEvmExecutionResult;
}

export interface SimulationErrorExecutionResult {
  type: ExecutionResultType.SIMULATION_ERROR;
  error: FailedEvmExecutionResult;
}

export interface StrategyErrorExecutionResult {
  type: ExecutionResultType.STRATEGY_ERROR;
  error: string;
}

export interface SuccessfulDeploymentExecutionResult {
  type: ExecutionResultType.SUCCESS;
  address: string;
}

export type DeploymentExecutionResult =
  | SuccessfulDeploymentExecutionResult
  | RevertedTransactionExecutionResult
  | FailedStaticCallExecutionResult
  | SimulationErrorExecutionResult
  | StrategyErrorExecutionResult;

export interface SuccessfulCallExecutionResult {
  type: ExecutionResultType.SUCCESS;
}

export type CallExecutionResult =
  | SuccessfulCallExecutionResult
  | RevertedTransactionExecutionResult
  | FailedStaticCallExecutionResult
  | SimulationErrorExecutionResult
  | StrategyErrorExecutionResult;

interface SuccessfulSendDataExecutionResult {
  type: ExecutionResultType.SUCCESS;
}

export type SendDataExecutionResult =
  | SuccessfulSendDataExecutionResult
  | RevertedTransactionExecutionResult
  | FailedStaticCallExecutionResult
  | SimulationErrorExecutionResult
  | StrategyErrorExecutionResult;

export interface SuccessfulStaticCallExecutionResult {
  type: ExecutionResultType.SUCCESS;
  result: SuccessfulEvmExecutionResult;
}

export type StaticCallExecutionResult =
  | SuccessfulStaticCallExecutionResult
  | FailedStaticCallExecutionResult
  | StrategyErrorExecutionResult;

/**
 * An execution state is used to keep track of the execution of a future.
 */
export type ExecutionState =
  | DeploymentExecutionState
  | CallExecutionState
  | StaticCallExecutionState
  | ContractAtExecutionState
  | ReadEventArgumentExecutionState
  | SendDataExecutionState;

/**
 * The different status that the execution can be at.
 */
export enum ExecutionStatus {
  STARTED = "STARATED",
  TIMEOUT = "TIMEOUT",
  SUCCESS = "SUCCESS",
  FAILED = "FAILED",
}

/**
 * The different kinds of execution states.
 */
export enum ExecutionSateType {
  DEPLOYMENT_EXECUTION_STATE = "DEPLOYMENT_EXECUTION_STATE",
  CALL_EXECUTION_STATE = "CALL_EXECUTION_STATE",
  STATIC_CALL_EXECUTION_STATE = "STATIC_CALL_EXECUTION_STATE",
  CONTRACT_AT_EXECUTION_STATE = "CONTRACT_AT_EXECUTION_STATE",
  READ_EVENT_ARGUMENT_EXECUTION_STATE = "READ_EVENT_ARGUMENT_EXECUTION_STATE",
  SEND_DATA_EXECUTION_STATE = "SEND_DATA_EXECUTION_STATE",
}

/**
 * The base interface for all execution states.
 *
 * Its id must match the id of the future that it belongs to.
 */
interface BaseExecutionState<
  ExecutionStateT extends ExecutionSateType,
  FutureTypeT extends FutureType
> {
  id: string;
  type: ExecutionStateT;
  futureType: FutureTypeT;
  strategy: string; // For example, "basic" | "create2". This needs to be string if we want custom ones.
  status: ExecutionStatus;
  dependencies: Set<string>;
}

/**
 * The execution state used for the different kinds of futures
 * that deploy contracts.
 *
 * If the execution is successful, the result will be the address of the deployed contract.
 *
 * If the execution fails, the result will be undefined and information about its failure
 * should be fetched from the latest network interaction.
 */
export interface DeploymentExecutionState
  extends BaseExecutionState<
    ExecutionSateType.DEPLOYMENT_EXECUTION_STATE,
    | FutureType.NAMED_CONTRACT_DEPLOYMENT
    | FutureType.ARTIFACT_CONTRACT_DEPLOYMENT
    | FutureType.NAMED_LIBRARY_DEPLOYMENT
    | FutureType.ARTIFACT_LIBRARY_DEPLOYMENT
  > {
  artifactFutureId: string;
  contractName: string;
  constructorArgs: SolidityParameterType[];
  libraries: Record<string, string>;
  value: bigint;
  from: string | undefined;
  networkInteractions: NetworkInteraction[];
  result?: DeploymentExecutionResult;
}

/**
 * An execution state used for the future that performs on-chain calls to contracts.
 *
 * If the execution fails, information about its failure should be fetched from the
 * latest network interaction.
 */
export interface CallExecutionState
  extends BaseExecutionState<
    ExecutionSateType.CALL_EXECUTION_STATE,
    FutureType.NAMED_CONTRACT_CALL
  > {
  artifactFutureId: string;
  contractAddress: string;
  functionName: string;
  args: SolidityParameterType[];
  value: bigint;
  from: string | undefined;
  networkInteractions: NetworkInteraction[];
  result?: CallExecutionResult;
}

/**
 * An execution state used for the future that performs static calls to contracts.
 *
 * Static calls' network interactions are limited to `StaticCall`. They cannot
 * perform any on-chain interaction.
 *
 * If its status is SUCCESS or FAILURE, its result will be available in the latest
 * network interaction.
 */
export interface StaticCallExecutionState
  extends BaseExecutionState<
    ExecutionSateType.STATIC_CALL_EXECUTION_STATE,
    FutureType.NAMED_STATIC_CALL
  > {
  artifactFutureId: string;
  contractAddress: string;
  functionName: string;
  args: SolidityParameterType[];
  from: string | undefined;
  networkInteractions: StaticCall[];
  result?: StaticCallExecutionResult;
}

/**
 * An execution state that tracks the execution of a contract at future.
 *
 * Contract at execution states are only stored for reconciliation purposes
 * and don't actually lead to any network interaction.
 *
 * Their execution is immediately completed.
 */
export interface ContractAtExecutionState
  extends BaseExecutionState<
    ExecutionSateType.CONTRACT_AT_EXECUTION_STATE,
    FutureType.NAMED_CONTRACT_AT | FutureType.ARTIFACT_CONTRACT_AT
  > {
  artifactFutureId: string;
  contractName: string;
  contractAddress: string;
}

/**
 * An execution state that tracks the execution of a contract at future.
 *
 * Read event argument execution states are only stored for reconciliation
 * purposes and don't actually lead to any network interaction.
 */
export interface ReadEventArgumentExecutionState
  extends BaseExecutionState<
    ExecutionSateType.READ_EVENT_ARGUMENT_EXECUTION_STATE,
    FutureType.READ_EVENT_ARGUMENT
  > {
  artifactFutureId: string;
  eventName: string;
  argumentName: string;
  txToReadFrom: string;
  emitterAddress: string;
  eventIndex: number;
  result?: SolidityParameterType;
}

/**
 * An execution state that tracks the execution of an arbitrary send data future.
 *
 * If the execution fails, information about its failure should be fetched from the
 * latest network interaction.
 */
export interface SendDataExecutionState
  extends BaseExecutionState<
    ExecutionSateType.SEND_DATA_EXECUTION_STATE,
    FutureType.SEND_DATA
  > {
  to: string;
  data: string;
  value: bigint;
  from: string | undefined;
  networkInteractions: NetworkInteraction[];
  result?: SendDataExecutionResult;
}

/**
 * A map of execution states indexed by their id.
 */
export interface ExecutionStateMap {
  [key: string]: ExecutionState;
}

/**
 * The execution state of an entire deployment.
 */
export interface DeploymentState {
  chainId: number;
  executionStates: ExecutionStateMap;
}
