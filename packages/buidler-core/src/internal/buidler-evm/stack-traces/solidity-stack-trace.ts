import { BN } from "ethereumjs-util";

import { ContractFunctionType } from "./model";

export enum StackTraceEntryType {
  CALLSTACK_ENTRY,
  UNRECOGNIZED_CREATE_CALLSTACK_ENTRY,
  UNRECOGNIZED_CONTRACT_CALLSTACK_ENTRY,
  PRECOMPILE_ERROR,
  REVERT_ERROR,
  FUNCTION_NOT_PAYABLE_ERROR,
  INVALID_PARAMS_ERROR,
  FALLBACK_NOT_PAYABLE_ERROR,
  UNRECOGNIZED_FUNCTION_WITHOUT_FALLBACK_ERROR, // TODO: Should trying to call a private/internal be a special case of this?
  RETURNDATA_SIZE_ERROR,
  NONCONTRACT_ACCOUNT_CALLED_ERROR,
  CALL_FAILED_ERROR,
  DIRECT_LIBRARY_CALL_ERROR,
  UNRECOGNIZED_CREATE_ERROR,
  UNRECOGNIZED_CONTRACT_ERROR,
  OTHER_EXECUTION_ERROR
}

export const FALLBACK_FUNCTION_NAME = "<fallback>";
export const CONSTRUCTOR_FUNCTION_NAME = "constructor";
export const UNRECOGNIZED_FUNCTION_NAME = "<unrecognized-selector>";
export const UNKNOWN_FUNCTION_NAME = "<unknown>";
export const PRECOMPILE_FUNCTION_NAME = "<precompile>";
export const UNRECOGNIZED_CONTRACT_NAME = "<UnrecognizedContract>";

export interface SourceReference {
  fileGlobalName: string;
  contract: string;
  function?: string;
  line: number;
}

export interface CallstackEntryStackTraceEntry {
  type: StackTraceEntryType.CALLSTACK_ENTRY;
  sourceReference: SourceReference;
  functionType: ContractFunctionType;
}

export interface UnrecognizedCreateCallstackEntryStackTraceEntry {
  type: StackTraceEntryType.UNRECOGNIZED_CREATE_CALLSTACK_ENTRY;
  sourceReference?: undefined;
}

export interface UnrecognizedContractCallstackEntryStackTraceEntry {
  type: StackTraceEntryType.UNRECOGNIZED_CONTRACT_CALLSTACK_ENTRY;
  address: Buffer;
  sourceReference?: undefined;
}

export interface PrecompileErrorStackTraceEntry {
  type: StackTraceEntryType.PRECOMPILE_ERROR;
  precompile: number;
  sourceReference?: undefined;
}

export interface RevertErrorStackTraceEntry {
  type: StackTraceEntryType.REVERT_ERROR;
  message: Buffer;
  sourceReference: SourceReference;
}

export interface FunctionNotPayableErrorStackTraceEntry {
  type: StackTraceEntryType.FUNCTION_NOT_PAYABLE_ERROR;
  value: BN;
  sourceReference: SourceReference;
}

export interface InvalidParamsErrorStackTraceEntry {
  type: StackTraceEntryType.INVALID_PARAMS_ERROR;
  sourceReference: SourceReference;
}

export interface FallbackNotPayableErrorStackTraceEntry {
  type: StackTraceEntryType.FALLBACK_NOT_PAYABLE_ERROR;
  value: BN;
  sourceReference: SourceReference;
}

export interface UnrecognizedFunctionWithoutFallbackErrorStackTraceEntry {
  type: StackTraceEntryType.UNRECOGNIZED_FUNCTION_WITHOUT_FALLBACK_ERROR;
  sourceReference: SourceReference;
}

export interface ReturndataSizeErrorStackTraceEntry {
  type: StackTraceEntryType.RETURNDATA_SIZE_ERROR;
  sourceReference: SourceReference;
}

export interface NonContractAccountCalledErrorStackTraceEntry {
  type: StackTraceEntryType.NONCONTRACT_ACCOUNT_CALLED_ERROR;
  sourceReference: SourceReference;
}

export interface CallFailedErrorStackTraceEntry {
  type: StackTraceEntryType.CALL_FAILED_ERROR;
  sourceReference: SourceReference;
}

export interface DirectLibraryCallErrorStackTraceEntry {
  type: StackTraceEntryType.DIRECT_LIBRARY_CALL_ERROR;
  sourceReference: SourceReference;
}

export interface UnrecognizedCreateErrorStackTraceEntry {
  type: StackTraceEntryType.UNRECOGNIZED_CREATE_ERROR;
  message: Buffer;
  sourceReference?: undefined;
}

export interface UnrecognizedContractErrorStackTraceEntry {
  type: StackTraceEntryType.UNRECOGNIZED_CONTRACT_ERROR;
  address: Buffer;
  message: Buffer;
  sourceReference?: undefined;
}

export interface OtherExecutionErrorStackTraceEntry {
  type: StackTraceEntryType.OTHER_EXECUTION_ERROR;
  sourceReference?: SourceReference;
}

export type SolidityStackTraceEntry =
  | CallstackEntryStackTraceEntry
  | UnrecognizedCreateCallstackEntryStackTraceEntry
  | UnrecognizedContractCallstackEntryStackTraceEntry
  | PrecompileErrorStackTraceEntry
  | RevertErrorStackTraceEntry
  | FunctionNotPayableErrorStackTraceEntry
  | InvalidParamsErrorStackTraceEntry
  | FallbackNotPayableErrorStackTraceEntry
  | UnrecognizedFunctionWithoutFallbackErrorStackTraceEntry
  | ReturndataSizeErrorStackTraceEntry
  | NonContractAccountCalledErrorStackTraceEntry
  | CallFailedErrorStackTraceEntry
  | DirectLibraryCallErrorStackTraceEntry
  | UnrecognizedCreateErrorStackTraceEntry
  | UnrecognizedContractErrorStackTraceEntry
  | OtherExecutionErrorStackTraceEntry;

export type SolidityStackTrace = SolidityStackTraceEntry[];
