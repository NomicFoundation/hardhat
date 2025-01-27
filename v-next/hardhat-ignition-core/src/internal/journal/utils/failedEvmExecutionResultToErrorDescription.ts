import type { FailedEvmExecutionResult } from "../../execution/types/evm-execution.js";

import { EvmExecutionResultTypes } from "../../execution/types/evm-execution.js";

export function failedEvmExecutionResultToErrorDescription(
  result: FailedEvmExecutionResult,
): string {
  switch (result.type) {
    case EvmExecutionResultTypes.INVALID_RESULT_ERROR: {
      return `Transaction appears to have succeeded, but has returned invalid data: '${result.data}'`;
    }
    case EvmExecutionResultTypes.REVERT_WITHOUT_REASON: {
      return `Transaction reverted`;
    }
    case EvmExecutionResultTypes.REVERT_WITH_REASON: {
      return `Transaction reverted with reason: '${result.message}'`;
    }
    case EvmExecutionResultTypes.REVERT_WITH_PANIC_CODE: {
      return `Transaction reverted with panic code (${result.panicCode}): '${result.panicName}'`;
    }
    case EvmExecutionResultTypes.REVERT_WITH_CUSTOM_ERROR: {
      return `Transaction reverted with custom error: '${
        result.errorName
      }' args: ${JSON.stringify(result.args.positional)}`;
    }
    case EvmExecutionResultTypes.REVERT_WITH_UNKNOWN_CUSTOM_ERROR: {
      return `Transaction reverted with unknown custom error. Error signature: '${result.signature}' data: '${result.data}'`;
    }
    case EvmExecutionResultTypes.REVERT_WITH_INVALID_DATA: {
      return `Transaction reverted with invalid error data: '${result.data}'`;
    }
    case EvmExecutionResultTypes.REVERT_WITH_INVALID_DATA_OR_UNKNOWN_CUSTOM_ERROR: {
      return `Transaction reverted with unknown error. Error signature: '${result.signature}' data: '${result.data}'`;
    }
  }
}
