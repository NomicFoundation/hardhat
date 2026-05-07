import type {
  SourceReference,
  CallstackEntryStackTraceEntry,
  UnrecognizedCreateCallstackEntryStackTraceEntry,
  UnrecognizedContractCallstackEntryStackTraceEntry,
  PrecompileErrorStackTraceEntry,
  RevertErrorStackTraceEntry,
  PanicErrorStackTraceEntry,
  CustomErrorStackTraceEntry,
  FunctionNotPayableErrorStackTraceEntry,
  InvalidParamsErrorStackTraceEntry,
  FallbackNotPayableErrorStackTraceEntry,
  FallbackNotPayableAndNoReceiveErrorStackTraceEntry,
  UnrecognizedFunctionWithoutFallbackErrorStackTraceEntry,
  MissingFallbackOrReceiveErrorStackTraceEntry,
  ReturndataSizeErrorStackTraceEntry,
  NonContractAccountCalledErrorStackTraceEntry,
  CallFailedErrorStackTraceEntry,
  DirectLibraryCallErrorStackTraceEntry,
  UnrecognizedCreateErrorStackTraceEntry,
  UnrecognizedContractErrorStackTraceEntry,
  OtherExecutionErrorStackTraceEntry,
  UnmappedSolc063RevertErrorStackTraceEntry,
  ContractTooLargeErrorStackTraceEntry,
  InternalFunctionCallStackEntry,
  ContractCallRunOutOfGasError,
  CheatcodeErrorStackTraceEntry,
  CheatcodeErrorDetails,
} from "@nomicfoundation/edr";

import {
  StackTraceEntryType,
  stackTraceEntryTypeToString,
  FALLBACK_FUNCTION_NAME,
  RECEIVE_FUNCTION_NAME,
  CONSTRUCTOR_FUNCTION_NAME,
  UNRECOGNIZED_FUNCTION_NAME,
  UNKNOWN_FUNCTION_NAME,
  PRECOMPILE_FUNCTION_NAME,
  UNRECOGNIZED_CONTRACT_NAME,
} from "@nomicfoundation/edr";

import type { CheatcodeErrorCode } from "@nomicfoundation/edr";

export {
  StackTraceEntryType,
  stackTraceEntryTypeToString,
  FALLBACK_FUNCTION_NAME,
  RECEIVE_FUNCTION_NAME,
  CONSTRUCTOR_FUNCTION_NAME,
  UNRECOGNIZED_FUNCTION_NAME,
  UNKNOWN_FUNCTION_NAME,
  PRECOMPILE_FUNCTION_NAME,
  UNRECOGNIZED_CONTRACT_NAME,
};

export type {
  SourceReference,
  CheatcodeErrorCode,
  CallstackEntryStackTraceEntry,
  UnrecognizedCreateCallstackEntryStackTraceEntry,
  UnrecognizedContractCallstackEntryStackTraceEntry,
  PrecompileErrorStackTraceEntry,
  RevertErrorStackTraceEntry,
  PanicErrorStackTraceEntry,
  CustomErrorStackTraceEntry,
  FunctionNotPayableErrorStackTraceEntry,
  InvalidParamsErrorStackTraceEntry,
  FallbackNotPayableErrorStackTraceEntry,
  FallbackNotPayableAndNoReceiveErrorStackTraceEntry,
  UnrecognizedFunctionWithoutFallbackErrorStackTraceEntry,
  MissingFallbackOrReceiveErrorStackTraceEntry,
  ReturndataSizeErrorStackTraceEntry,
  NonContractAccountCalledErrorStackTraceEntry,
  CallFailedErrorStackTraceEntry,
  DirectLibraryCallErrorStackTraceEntry,
  UnrecognizedCreateErrorStackTraceEntry,
  UnrecognizedContractErrorStackTraceEntry,
  OtherExecutionErrorStackTraceEntry,
  UnmappedSolc063RevertErrorStackTraceEntry,
  ContractTooLargeErrorStackTraceEntry,
  InternalFunctionCallStackEntry,
  ContractCallRunOutOfGasError,
  CheatcodeErrorDetails,
};

export type SolidityStackTraceEntry =
  | CallstackEntryStackTraceEntry
  | UnrecognizedCreateCallstackEntryStackTraceEntry
  | UnrecognizedContractCallstackEntryStackTraceEntry
  | PrecompileErrorStackTraceEntry
  | RevertErrorStackTraceEntry
  | PanicErrorStackTraceEntry
  | CustomErrorStackTraceEntry
  | FunctionNotPayableErrorStackTraceEntry
  | InvalidParamsErrorStackTraceEntry
  | FallbackNotPayableErrorStackTraceEntry
  | FallbackNotPayableAndNoReceiveErrorStackTraceEntry
  | UnrecognizedFunctionWithoutFallbackErrorStackTraceEntry
  | MissingFallbackOrReceiveErrorStackTraceEntry
  | ReturndataSizeErrorStackTraceEntry
  | NonContractAccountCalledErrorStackTraceEntry
  | CallFailedErrorStackTraceEntry
  | DirectLibraryCallErrorStackTraceEntry
  | UnrecognizedCreateErrorStackTraceEntry
  | UnrecognizedContractErrorStackTraceEntry
  | OtherExecutionErrorStackTraceEntry
  | UnmappedSolc063RevertErrorStackTraceEntry
  | ContractTooLargeErrorStackTraceEntry
  | InternalFunctionCallStackEntry
  | ContractCallRunOutOfGasError
  | CheatcodeErrorStackTraceEntry;

export type SolidityStackTrace = SolidityStackTraceEntry[];
