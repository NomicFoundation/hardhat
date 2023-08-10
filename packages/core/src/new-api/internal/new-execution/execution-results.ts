///////////////////////////////////////////////////////////////////////////////
///                             EXPLANATION                                 ///
///////////////////////////////////////////////////////////////////////////////
///
/// The possible result types of an execution, including the possible errors.
///////////////////////////////////////////////////////////////////////////////

import { SolidityParameterType } from "../../types/module";

/**
 * The results returned by Solidity either as a function result, or as
 * custom error parameters.
 */
export interface ExecutionResult {
  named: Record<string, SolidityParameterType>;
  numbered: SolidityParameterType[];
}

/**
 * Each of the possible execution error types that Ignition can handle.
 */
export enum ExecutionErrorTypes {
  REVERT_WITHOUT_REASON = "REVERT_WITHOUT_REASON",
  REVERT_WITH_REASON = "REVERT_WITH_REASON",
  REVERT_WITH_PANIC_CODE = "REVERT_WITH_PANIC_CODE",
  REVERT_WITH_CUSTOM_ERROR = "REVERT_WITH_CUSTOM_ERROR",
  REVERT_WITH_UNKNOWN_CUSTOM_ERROR = "REVERT_WITH_UNKNOWN_CUSTOM_ERROR",
  REVERT_WITH_INVALID_DATA = "REVERT_WITH_INVALID_DATA",
  REVERT_WITH_INVALID_DATA_OR_UNKNOWN_CUSTOM_ERROR = "REVERT_WITH_INVALID_DATA_OR_UNKNOWN_CUSTOM_ERROR",
  RETURNED_INVALIDA_DATA_EXECUTION_ERROR = "RETURNED_INVALIDA_DATA_EXECUTION_ERROR",
}

/**
 * The execution reverted without a reason string nor any other kind of error.
 */
export interface RevertWithoutReasonExecutionError {
  type: ExecutionErrorTypes.REVERT_WITHOUT_REASON;
}

/**
 * The execution reverted with a reason string by calling `revert("reason")`.
 */
export interface RevertWithReasonExecutionError {
  type: ExecutionErrorTypes.REVERT_WITH_REASON;
  message: string;
}

/**
 * The execution reverted with a panic code due to some error that solc handled.
 */
export interface RevertWithPanicCodeExecutionError {
  type: ExecutionErrorTypes.REVERT_WITH_PANIC_CODE;
  panicCode: number;
  panicCodeName: string;
}

/**
 * The execution reverted with a custom error that was defined by the contract.
 */
export interface RevertWithCustomErrorExecutionError {
  type: ExecutionErrorTypes.REVERT_WITH_CUSTOM_ERROR;
  errorName: string;
  args: ExecutionResult;
}

/**
 * The execution reverted with a custom error that wasn't defined by the contrac,
 * yet the JSON-RPC server indicated that this failure was due to a custom error.
 */
export interface RevertWithUnknownCustomErrorExecutionError {
  type: ExecutionErrorTypes.REVERT_WITH_UNKNOWN_CUSTOM_ERROR;
  signature: string;
  data: string;
}

/**
 * The execution failed due to some error whose kind we can recognize, but that
 * we can't decode becase its data is invalid.
 */
export interface RevertWithInvalidDataExecutionError {
  type: ExecutionErrorTypes.REVERT_WITH_INVALID_DATA;
  data: string;
}

/**
 * If this error is returned the execution either returned completely invalid/unrecognizable
 * data, or a custom error that we can't recognize and the JSON-RPC server either.
 */
export interface RevertWithInvalidDataOrUnknownCustomErrorExecutionError {
  type: ExecutionErrorTypes.REVERT_WITH_INVALID_DATA_OR_UNKNOWN_CUSTOM_ERROR;
  signature: string;
  data: string;
}

/**
 * The execution was seemgly succseful, but the data returned by it was invalid.
 */
export interface ReturnedInvalidDataExecutionError {
  type: ExecutionErrorTypes.RETURNED_INVALIDA_DATA_EXECUTION_ERROR;
  data: string;
}

/**
 * The different kinds of execution error.
 */
export type ExecutionError =
  | ReturnedInvalidDataExecutionError
  | RevertWithoutReasonExecutionError
  | RevertWithReasonExecutionError
  | RevertWithPanicCodeExecutionError
  | RevertWithCustomErrorExecutionError
  | RevertWithUnknownCustomErrorExecutionError
  | RevertWithInvalidDataExecutionError
  | RevertWithInvalidDataOrUnknownCustomErrorExecutionError;

/**
 * Determines whether the given value is an execution error.
 */
export function isExecutionError(value: unknown): value is ExecutionError {
  return (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    typeof value.type === "string" &&
    ExecutionErrorTypes[value.type as ExecutionErrorTypes] !== undefined
  );
}
