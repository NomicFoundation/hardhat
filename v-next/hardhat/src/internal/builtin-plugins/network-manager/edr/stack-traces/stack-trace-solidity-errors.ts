import type {
  SolidityStackTrace,
  SolidityStackTraceEntry,
  SourceReference,
} from "./solidity-stack-trace.js";

import { ReturnData } from "@ignored/edr-optimism";
import { assertHardhatInvariant } from "@ignored/hardhat-vnext-errors";
import { bytesToHexString } from "@ignored/hardhat-vnext-utils/bytes";

import { panicErrorCodeToMessage } from "./panic-errors.js";
import {
  StackTraceEntryType,
  CONSTRUCTOR_FUNCTION_NAME,
  PRECOMPILE_FUNCTION_NAME,
  UNKNOWN_FUNCTION_NAME,
  UNRECOGNIZED_CONTRACT_NAME,
  UNRECOGNIZED_FUNCTION_NAME,
} from "./solidity-stack-trace.js";

export function createSolidityErrorWithStackTrace(
  fallbackMessage: string,
  stackTrace: SolidityStackTrace,
  data: string,
  transactionHash?: string,
): SolidityError {
  const originalPrepareStackTrace = Error.prepareStackTrace;

  try {
    Error.prepareStackTrace = (error, stack) => {
      // Skip error management related stack traces
      const adjustedStack = stack.slice(1);

      for (const entry of stackTrace) {
        const callsite = encodeStackTraceEntry(entry);
        if (callsite !== undefined) {
          adjustedStack.unshift(callsite);
        }
      }

      assertHardhatInvariant(
        originalPrepareStackTrace !== undefined,
        "Error.prepareStackTrace should be defined",
      );

      return originalPrepareStackTrace(error, adjustedStack);
    };

    const message =
      getMessageFromLastStackTraceEntry(stackTrace[stackTrace.length - 1]) ??
      fallbackMessage;

    const solidityError = new SolidityError(
      message,
      stackTrace,
      data,
      transactionHash,
    );

    /* eslint-disable-next-line @typescript-eslint/no-unused-expressions
    -- As the stack property is lazy-loaded in v8, we need to access it
    to trigger the custom prepareStackTrace logic */
    solidityError.stack;

    return solidityError;
  } finally {
    Error.prepareStackTrace = originalPrepareStackTrace;
  }
}

export function encodeStackTraceEntry(
  stackTraceEntry: SolidityStackTraceEntry,
): SolidityCallSite {
  switch (stackTraceEntry.type) {
    case StackTraceEntryType.UNRECOGNIZED_FUNCTION_WITHOUT_FALLBACK_ERROR:
    case StackTraceEntryType.MISSING_FALLBACK_OR_RECEIVE_ERROR:
      return sourceReferenceToSolidityCallsite({
        ...stackTraceEntry.sourceReference,
        function: UNRECOGNIZED_FUNCTION_NAME,
      });

    case StackTraceEntryType.CALLSTACK_ENTRY:
    case StackTraceEntryType.REVERT_ERROR:
    case StackTraceEntryType.CUSTOM_ERROR:
    case StackTraceEntryType.FUNCTION_NOT_PAYABLE_ERROR:
    case StackTraceEntryType.INVALID_PARAMS_ERROR:
    case StackTraceEntryType.FALLBACK_NOT_PAYABLE_ERROR:
    case StackTraceEntryType.FALLBACK_NOT_PAYABLE_AND_NO_RECEIVE_ERROR:
    case StackTraceEntryType.RETURNDATA_SIZE_ERROR:
    case StackTraceEntryType.NONCONTRACT_ACCOUNT_CALLED_ERROR:
    case StackTraceEntryType.CALL_FAILED_ERROR:
    case StackTraceEntryType.DIRECT_LIBRARY_CALL_ERROR:
      return sourceReferenceToSolidityCallsite(stackTraceEntry.sourceReference);

    case StackTraceEntryType.UNRECOGNIZED_CREATE_CALLSTACK_ENTRY:
      return new SolidityCallSite(
        undefined,
        UNRECOGNIZED_CONTRACT_NAME,
        CONSTRUCTOR_FUNCTION_NAME,
        undefined,
      );

    case StackTraceEntryType.UNRECOGNIZED_CONTRACT_CALLSTACK_ENTRY:
      return new SolidityCallSite(
        bytesToHexString(stackTraceEntry.address),
        UNRECOGNIZED_CONTRACT_NAME,
        UNKNOWN_FUNCTION_NAME,
        undefined,
      );

    case StackTraceEntryType.PRECOMPILE_ERROR:
      return new SolidityCallSite(
        undefined,
        `<PrecompileContract ${stackTraceEntry.precompile}>`,
        PRECOMPILE_FUNCTION_NAME,
        undefined,
      );

    case StackTraceEntryType.UNRECOGNIZED_CREATE_ERROR:
      return new SolidityCallSite(
        undefined,
        UNRECOGNIZED_CONTRACT_NAME,
        CONSTRUCTOR_FUNCTION_NAME,
        undefined,
      );

    case StackTraceEntryType.UNRECOGNIZED_CONTRACT_ERROR:
      return new SolidityCallSite(
        bytesToHexString(stackTraceEntry.address),
        UNRECOGNIZED_CONTRACT_NAME,
        UNKNOWN_FUNCTION_NAME,
        undefined,
      );

    case StackTraceEntryType.INTERNAL_FUNCTION_CALLSTACK_ENTRY:
      return new SolidityCallSite(
        stackTraceEntry.sourceReference.sourceName,
        stackTraceEntry.sourceReference.contract,
        `internal@${stackTraceEntry.pc}`,
        undefined,
      );
    case StackTraceEntryType.CONTRACT_CALL_RUN_OUT_OF_GAS_ERROR:
      if (stackTraceEntry.sourceReference !== undefined) {
        return sourceReferenceToSolidityCallsite(
          stackTraceEntry.sourceReference,
        );
      }

      return new SolidityCallSite(
        undefined,
        UNRECOGNIZED_CONTRACT_NAME,
        UNKNOWN_FUNCTION_NAME,
        undefined,
      );

    case StackTraceEntryType.OTHER_EXECUTION_ERROR:
    case StackTraceEntryType.CONTRACT_TOO_LARGE_ERROR:
    case StackTraceEntryType.PANIC_ERROR:
    case StackTraceEntryType.UNMAPPED_SOLC_0_6_3_REVERT_ERROR:
      if (stackTraceEntry.sourceReference === undefined) {
        return new SolidityCallSite(
          undefined,
          UNRECOGNIZED_CONTRACT_NAME,
          UNKNOWN_FUNCTION_NAME,
          undefined,
        );
      }

      return sourceReferenceToSolidityCallsite(stackTraceEntry.sourceReference);
  }
}

function sourceReferenceToSolidityCallsite(
  sourceReference: SourceReference,
): SolidityCallSite {
  return new SolidityCallSite(
    sourceReference.sourceName,
    sourceReference.contract,
    sourceReference.function ?? UNKNOWN_FUNCTION_NAME,
    sourceReference.line,
  );
}

function getMessageFromLastStackTraceEntry(
  stackTraceEntry: SolidityStackTraceEntry,
): string | undefined {
  switch (stackTraceEntry.type) {
    case StackTraceEntryType.PRECOMPILE_ERROR:
      return `Transaction reverted: call to precompile ${stackTraceEntry.precompile} failed`;

    case StackTraceEntryType.FUNCTION_NOT_PAYABLE_ERROR:
      return `Transaction reverted: non-payable function was called with value ${stackTraceEntry.value.toString(
        10,
      )}`;

    case StackTraceEntryType.INVALID_PARAMS_ERROR:
      return `Transaction reverted: function was called with incorrect parameters`;

    case StackTraceEntryType.FALLBACK_NOT_PAYABLE_ERROR:
      return `Transaction reverted: fallback function is not payable and was called with value ${stackTraceEntry.value.toString(
        10,
      )}`;

    case StackTraceEntryType.FALLBACK_NOT_PAYABLE_AND_NO_RECEIVE_ERROR:
      return `Transaction reverted: there's no receive function, fallback function is not payable and was called with value ${stackTraceEntry.value.toString(
        10,
      )}`;

    case StackTraceEntryType.UNRECOGNIZED_FUNCTION_WITHOUT_FALLBACK_ERROR:
      return `Transaction reverted: function selector was not recognized and there's no fallback function`;

    case StackTraceEntryType.MISSING_FALLBACK_OR_RECEIVE_ERROR:
      return `Transaction reverted: function selector was not recognized and there's no fallback nor receive function`;

    case StackTraceEntryType.RETURNDATA_SIZE_ERROR:
      return `Transaction reverted: function returned an unexpected amount of data`;

    case StackTraceEntryType.NONCONTRACT_ACCOUNT_CALLED_ERROR:
      return `Transaction reverted: function call to a non-contract account`;

    case StackTraceEntryType.CALL_FAILED_ERROR:
      return `Transaction reverted: function call failed to execute`;

    case StackTraceEntryType.DIRECT_LIBRARY_CALL_ERROR:
      return `Transaction reverted: library was called directly`;

    case StackTraceEntryType.UNRECOGNIZED_CREATE_ERROR:
    case StackTraceEntryType.UNRECOGNIZED_CONTRACT_ERROR: {
      const returnData = new ReturnData(stackTraceEntry.returnData);
      if (returnData.isErrorReturnData()) {
        return `VM Exception while processing transaction: reverted with reason string '${returnData.decodeError()}'`;
      }

      if (returnData.isPanicReturnData()) {
        const message = panicErrorCodeToMessage(returnData.decodePanic());
        return `VM Exception while processing transaction: ${message}`;
      }

      if (!returnData.isEmpty()) {
        return `VM Exception while processing transaction: reverted with an unrecognized custom error (return data: ${bytesToHexString(returnData.value)})`;
      }

      if (stackTraceEntry.isInvalidOpcodeError) {
        return "VM Exception while processing transaction: invalid opcode";
      }

      return "Transaction reverted without a reason string";
    }

    case StackTraceEntryType.REVERT_ERROR: {
      const returnData = new ReturnData(stackTraceEntry.returnData);
      if (returnData.isErrorReturnData()) {
        return `VM Exception while processing transaction: reverted with reason string '${returnData.decodeError()}'`;
      }

      if (stackTraceEntry.isInvalidOpcodeError) {
        return "VM Exception while processing transaction: invalid opcode";
      }

      return "Transaction reverted without a reason string";
    }

    case StackTraceEntryType.PANIC_ERROR:
      const panicMessage = panicErrorCodeToMessage(stackTraceEntry.errorCode);
      return `VM Exception while processing transaction: ${panicMessage}`;

    case StackTraceEntryType.CUSTOM_ERROR:
      return `VM Exception while processing transaction: ${stackTraceEntry.message}`;

    case StackTraceEntryType.OTHER_EXECUTION_ERROR:
      // TODO: What if there was returnData?
      return `Transaction reverted and Hardhat couldn't infer the reason.`;

    case StackTraceEntryType.UNMAPPED_SOLC_0_6_3_REVERT_ERROR:
      return "Transaction reverted without a reason string and without a valid sourcemap provided by the compiler. Some line numbers may be off. We strongly recommend upgrading solc and always using revert reasons.";

    case StackTraceEntryType.CONTRACT_TOO_LARGE_ERROR:
      return "Transaction reverted: trying to deploy a contract whose code is too large";

    case StackTraceEntryType.CONTRACT_CALL_RUN_OUT_OF_GAS_ERROR:
      return "Transaction reverted: contract call run out of gas and made the transaction revert";

    /* These types are not expected to be the last entry in the stack trace, as
    their presence indicates that another frame should follow in the call stack. */
    case StackTraceEntryType.CALLSTACK_ENTRY:
    case StackTraceEntryType.UNRECOGNIZED_CREATE_CALLSTACK_ENTRY:
    case StackTraceEntryType.UNRECOGNIZED_CONTRACT_CALLSTACK_ENTRY:
    case StackTraceEntryType.INTERNAL_FUNCTION_CALLSTACK_ENTRY:
      return undefined;
  }
}

/**
 * Note: This error class MUST NOT extend ProviderError, as libraries use the
 * code property to detect if they are dealing with a JSON-RPC error, and take
 * control of errors.
 **/
export class SolidityError extends Error {
  constructor(
    message: string,
    public readonly stackTrace: SolidityStackTrace,
    public readonly data: string,
    public readonly transactionHash?: string,
  ) {
    super(message);

    Object.defineProperty(this, Symbol.for("nodejs.util.inspect.custom"), {
      value: () =>
        this.stack !== undefined
          ? this.stack
          : "Internal error when encoding SolidityError",
      writable: false,
      enumerable: false,
      configurable: true,
    });
  }
}

export class SolidityCallSite implements NodeJS.CallSite {
  readonly #sourceName: string | undefined;
  readonly #contract: string | undefined;
  readonly #functionName: string | undefined;
  readonly #line: number | undefined;

  constructor(
    _sourceName: string | undefined,
    _contract: string | undefined,
    _functionName: string | undefined,
    _line: number | undefined,
  ) {
    this.#sourceName = _sourceName;
    this.#contract = _contract;
    this.#functionName = _functionName;
    this.#line = _line;
  }

  public getColumnNumber() {
    return null;
  }

  public getEvalOrigin() {
    return undefined;
  }

  public getFileName(): string {
    return this.#sourceName ?? "unknown";
  }

  public getFunction() {
    return undefined;
  }

  public getFunctionName(): string | null {
    // if it's a top-level function, we print its name
    if (this.#contract === undefined) {
      return this.#functionName ?? null;
    }

    return null;
  }

  public getLineNumber(): number | null {
    return this.#line !== undefined ? this.#line : null;
  }

  public getMethodName(): string | null {
    if (this.#contract !== undefined) {
      return this.#functionName ?? null;
    }

    return null;
  }

  public getPosition() {
    return 0;
  }

  public getPromiseIndex() {
    return 0;
  }

  public getScriptNameOrSourceURL() {
    return "";
  }

  public getThis() {
    return undefined;
  }

  public getTypeName(): string | null {
    return this.#contract ?? null;
  }

  public isAsync() {
    return false;
  }

  public isConstructor() {
    return false;
  }

  public isEval() {
    return false;
  }

  public isNative() {
    return false;
  }

  public isPromiseAll() {
    return false;
  }

  public isToplevel() {
    return false;
  }

  public getScriptHash(): string {
    return "";
  }

  public getEnclosingColumnNumber(): number {
    return 0;
  }

  public getEnclosingLineNumber(): number {
    return 0;
  }

  // Extracted and adapted from source-map-support package, which extracts it from V8
  public toString(): string {
    let fileLocation = this.getFileName();

    if (this.getLineNumber() !== null) {
      fileLocation += `:${this.getLineNumber()}`;
    }

    let line = "";
    const functionName = this.getFunctionName();
    let addSuffix = true;
    const isConstructor = this.isConstructor();
    const isMethodCall = !(this.isToplevel() || isConstructor);
    if (isMethodCall) {
      const typeName = this.getTypeName();
      const methodName = this.getMethodName();
      if (functionName !== null) {
        if (typeName !== null) {
          line += typeName + ".";
        }
        line += functionName;
      } else {
        line += typeName + "." + (methodName ?? "<anonymous>");
      }
    } else if (isConstructor) {
      line += "new " + (functionName ?? "<anonymous>");
    } else if (functionName !== null) {
      line += functionName;
    } else {
      line += fileLocation;
      addSuffix = false;
    }
    if (addSuffix) {
      line += " (" + fileLocation + ")";
    }
    return line;
  }
}
