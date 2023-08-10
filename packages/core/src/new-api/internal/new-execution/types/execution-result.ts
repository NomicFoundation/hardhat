import {
  FailedEvmExecutionResult,
  SuccessfulEvmExecutionResult,
} from "./evm-execution";

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
