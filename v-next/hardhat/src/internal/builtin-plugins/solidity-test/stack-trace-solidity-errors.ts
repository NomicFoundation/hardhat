import type { SolidityStackTraceEntry } from "../network-manager/edr/stack-traces/solidity-stack-trace.js";

import { panicErrorCodeToMessage } from "../network-manager/edr/stack-traces/panic-errors.js";
import { StackTraceEntryType } from "../network-manager/edr/stack-traces/solidity-stack-trace.js";

export function getMessageFromLastStackTraceEntry(
  stackTraceEntry: SolidityStackTraceEntry,
): string | undefined {
  switch (stackTraceEntry.type) {
    case StackTraceEntryType.PRECOMPILE_ERROR:
      return `Call to precompile ${stackTraceEntry.precompile} failed`;

    case StackTraceEntryType.FUNCTION_NOT_PAYABLE_ERROR:
      return `Non-payable function was called with value ${stackTraceEntry.value.toString(
        10,
      )}`;

    case StackTraceEntryType.INVALID_PARAMS_ERROR:
      return `Function was called with incorrect parameters`;

    case StackTraceEntryType.FALLBACK_NOT_PAYABLE_ERROR:
      return `Fallback function is not payable and was called with value ${stackTraceEntry.value.toString(
        10,
      )}`;

    case StackTraceEntryType.FALLBACK_NOT_PAYABLE_AND_NO_RECEIVE_ERROR:
      return `There's no receive function, fallback function is not payable and was called with value ${stackTraceEntry.value.toString(
        10,
      )}`;

    case StackTraceEntryType.UNRECOGNIZED_FUNCTION_WITHOUT_FALLBACK_ERROR:
      return `Function selector was not recognized and there's no fallback function`;

    case StackTraceEntryType.MISSING_FALLBACK_OR_RECEIVE_ERROR:
      return `Function selector was not recognized and there's no fallback nor receive function`;

    case StackTraceEntryType.RETURNDATA_SIZE_ERROR:
      return `Function returned an unexpected amount of data`;

    case StackTraceEntryType.NONCONTRACT_ACCOUNT_CALLED_ERROR:
      return `Function call to a non-contract account`;

    case StackTraceEntryType.CALL_FAILED_ERROR:
      return `Function call failed to execute`;

    case StackTraceEntryType.DIRECT_LIBRARY_CALL_ERROR:
      return `Library was called directly`;

    /* These types are not associate with a more detailed error message */
    case StackTraceEntryType.UNRECOGNIZED_CREATE_ERROR:
    case StackTraceEntryType.UNRECOGNIZED_CONTRACT_ERROR: {
      return undefined;
    }

    /* These types are not associate with a more detailed error message */
    case StackTraceEntryType.REVERT_ERROR: {
      return undefined;
    }

    case StackTraceEntryType.PANIC_ERROR:
      return panicErrorCodeToMessage(stackTraceEntry.errorCode);

    case StackTraceEntryType.CUSTOM_ERROR:
      return stackTraceEntry.message;

    case StackTraceEntryType.CHEATCODE_ERROR:
      return stackTraceEntry.message;

    case StackTraceEntryType.CONTRACT_TOO_LARGE_ERROR:
      return "Trying to deploy a contract whose code is too large";

    case StackTraceEntryType.CONTRACT_CALL_RUN_OUT_OF_GAS_ERROR:
      return "Contract call run out of gas";

    /* These types are not associate with a more detailed error message */
    case StackTraceEntryType.UNMAPPED_SOLC_0_6_3_REVERT_ERROR:
    case StackTraceEntryType.OTHER_EXECUTION_ERROR:
      return undefined;

    /* These types are not expected to be the last entry in the stack trace, as
    their presence indicates that another frame should follow in the call stack. */
    case StackTraceEntryType.CALLSTACK_ENTRY:
    case StackTraceEntryType.UNRECOGNIZED_CREATE_CALLSTACK_ENTRY:
    case StackTraceEntryType.UNRECOGNIZED_CONTRACT_CALLSTACK_ENTRY:
    case StackTraceEntryType.INTERNAL_FUNCTION_CALLSTACK_ENTRY:
      return undefined;
  }
}
