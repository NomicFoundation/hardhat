import { SolidityParameterType } from "../types/module";

import {
  EvmExecutionResultTypes,
  EvmTuple,
  FailedEvmExecutionResult,
} from "./execution/types/evm-execution";
import {
  ExecutionResultType,
  FailedStaticCallExecutionResult,
  RevertedTransactionExecutionResult,
  SimulationErrorExecutionResult,
  StrategyErrorExecutionResult,
  StrategySimulationErrorExecutionResult,
} from "./execution/types/execution-result";
import { convertEvmTupleToSolidityParam } from "./execution/utils/convert-evm-tuple-to-solidity-param";

/**
 * Formats an execution error result into a human-readable string.
 */
export function formatExecutionError(
  result:
    | SimulationErrorExecutionResult
    | StrategySimulationErrorExecutionResult
    | RevertedTransactionExecutionResult
    | FailedStaticCallExecutionResult
    | StrategyErrorExecutionResult
): string {
  switch (result.type) {
    case ExecutionResultType.SIMULATION_ERROR:
      return `Simulating the transaction failed with error: ${formatFailedEvmExecutionResult(
        result.error
      )}`;
    case ExecutionResultType.STRATEGY_SIMULATION_ERROR:
      return `Simulating the transaction failed with error: ${result.error}`;
    case ExecutionResultType.REVERTED_TRANSACTION:
      return `Transaction ${result.txHash} reverted`;
    case ExecutionResultType.STATIC_CALL_ERROR:
      return `Static call failed with error: ${formatFailedEvmExecutionResult(
        result.error
      )}`;
    case ExecutionResultType.STRATEGY_ERROR:
      return `Execution failed with error: ${result.error}`;
  }
}

/**
 * Formats a failed EVM execution result into a human-readable string.
 */
export function formatFailedEvmExecutionResult(
  result: FailedEvmExecutionResult
): string {
  switch (result.type) {
    case EvmExecutionResultTypes.INVALID_RESULT_ERROR:
      return `Invalid data returned`;

    case EvmExecutionResultTypes.REVERT_WITHOUT_REASON:
      return `Reverted without reason`;

    case EvmExecutionResultTypes.REVERT_WITH_REASON:
      return `Reverted with reason "${result.message}"`;

    case EvmExecutionResultTypes.REVERT_WITH_PANIC_CODE:
      return `Reverted with panic code ${result.panicCode} (${result.panicName}))`;

    case EvmExecutionResultTypes.REVERT_WITH_CUSTOM_ERROR:
      return `Reverted with custom error ${formatCustomError(
        result.errorName,
        result.args
      )}`;

    case EvmExecutionResultTypes.REVERT_WITH_UNKNOWN_CUSTOM_ERROR:
      return `Reverted with unknown custom error (signature ${result.signature})`;

    case EvmExecutionResultTypes.REVERT_WITH_INVALID_DATA:
      return `Reverted with invalid return data`;

    case EvmExecutionResultTypes.REVERT_WITH_INVALID_DATA_OR_UNKNOWN_CUSTOM_ERROR:
      return `Reverted with invalid return data or unknown custom error (signature ${result.signature})`;
  }
}

/**
 * Formats a custom error into a human-readable string.
 */
export function formatCustomError(errorName: string, args: EvmTuple): string {
  const transformedArgs = convertEvmTupleToSolidityParam(args);
  return `${errorName}(${transformedArgs
    .map(formatSolidityParameter)
    .join(", ")})`;
}

/**
 * Formats a Solidity parameter into a human-readable string.
 *
 * @beta
 */
export function formatSolidityParameter(param: SolidityParameterType): string {
  if (Array.isArray(param)) {
    const values = param.map(formatSolidityParameter);

    return `[${values.join(", ")}]`;
  }

  if (typeof param === "object") {
    const values = Object.entries(param).map(
      ([key, value]) => `"${key}": ${formatSolidityParameter(value)}`
    );

    return `{${values.join(", ")}}`;
  }

  if (typeof param === "string") {
    return `"${param}"`;
  }

  return param.toString();
}
