import {
  FailedEvmExecutionResult,
  SuccessfulEvmExecutionResult,
} from "./evm-execution";

/**
 * The differnt types of result that executing a future can produce.
 */
export enum ExecutionResultType {
  SUCCESS = "SUCCESS",
  REVERTED_TRANSACTION = "REVERTED_TRANSACTION",
  STATIC_CALL_ERROR = "STATIC_CALL_ERROR",
  STRATEGY_ERROR = "STRATEGY_ERROR",
}

/**
 * A transaction reverted, making the execution fail.
 */
export interface RevertedTransactionExecutionResult {
  type: ExecutionResultType.REVERTED_TRANSACTION;
}

/**
 * A static call failed, making the execution fail.
 */
export interface FailedStaticCallExecutionResult {
  type: ExecutionResultType.STATIC_CALL_ERROR;
  error: FailedEvmExecutionResult;
}

/**
 * The execution strategy returned a strategy-specific error.
 */
export interface StrategyErrorExecutionResult {
  type: ExecutionResultType.STRATEGY_ERROR;
  error: string;
}

/**
 * A deployment was successfully executed.
 */
export interface SuccessfulDeploymentExecutionResult {
  type: ExecutionResultType.SUCCESS;
  address: string;
}

/**
 * The different results that executing a future that deploys
 * a contract can produce.
 */
export type DeploymentExecutionResult =
  | SuccessfulDeploymentExecutionResult
  | RevertedTransactionExecutionResult
  | FailedStaticCallExecutionResult
  | StrategyErrorExecutionResult;

/**
 * A call future was successfully executed.
 */
export interface SuccessfulCallExecutionResult {
  type: ExecutionResultType.SUCCESS;
}

/**
 * The different results that executing a call future can produce.
 */
export type CallExecutionResult =
  | SuccessfulCallExecutionResult
  | RevertedTransactionExecutionResult
  | FailedStaticCallExecutionResult
  | StrategyErrorExecutionResult;

/**
 * A send data future was successfully executed.
 */
export interface SuccessfulSendDataExecutionResult {
  type: ExecutionResultType.SUCCESS;
}

/**
 * The different results that executing a send data future can produce.
 */
export type SendDataExecutionResult =
  | SuccessfulSendDataExecutionResult
  | RevertedTransactionExecutionResult
  | FailedStaticCallExecutionResult
  | StrategyErrorExecutionResult;

/**
 * A static call future was successfully executed.
 */
export interface SuccessfulStaticCallExecutionResult {
  type: ExecutionResultType.SUCCESS;
  result: SuccessfulEvmExecutionResult;
}

/**
 * The different results that executing a static call future can produce.
 */
export type StaticCallExecutionResult =
  | SuccessfulStaticCallExecutionResult
  | FailedStaticCallExecutionResult
  | StrategyErrorExecutionResult;
