///////////////////////////////////////////////////////////////////////////////
///                             EXPLANATION                                 ///
///////////////////////////////////////////////////////////////////////////////
///
/// This is the main module to decode execution results (both successful and
/// unsuccessful) of network interactions.
///
/// This module build on top of the execution strategy, focusing on the general
/// cases and only leaving the specific to the strategy. It also normalizes
/// the result types.
///////////////////////////////////////////////////////////////////////////////

import {
  PANIC_CODE_NAMES,
  PANIC_CODE_SIGNATURE,
  REVERT_REASON_SIGNATURE,
} from "./constants";
import {
  ExecutionError,
  ExecutionErrorTypes,
  ReturnedInvalidDataExecutionError,
  RevertWithInvalidDataExecutionError,
  RevertWithPanicCodeExecutionError,
  RevertWithReasonExecutionError,
  ExecutionResult,
} from "./execution-results";
import {
  CustomError,
  DecodingResultType,
  InvalidCustomError,
  InvalidReturnData,
} from "./execution-stratey-adaption";

/**
 * This function decodes a successful result of having run eth_call.
 *
 * @param returnData The return data of the execution, as encoded in the JSON-RPC response.
 * @param abi The ABI of the contract. // TODO: This and the following should be replaced by the ExecutionState and NetworkInteraction.
 * @param functionName The function name
 * @returns An object with the decoded result, or undefined if it failed to be decoded.
 */
export async function decodeResult(
  returnData: string,
  decode: (returnData: string) => Promise<InvalidReturnData | ExecutionResult>
): Promise<ReturnedInvalidDataExecutionError | ExecutionResult> {
  const decoded = await decode(returnData);

  if (isInvalidReturnData(decoded)) {
    return {
      type: ExecutionErrorTypes.RETURNED_INVALIDA_DATA_EXECUTION_ERROR,
      data: returnData,
    };
  }

  return decoded;
}

/**
 * Decodes an execution error that happened when running an eth_call.
 *
 * @param returnData The return data of the execution, as encoded in the JSON-RPC response.
 * @param abi The ABI of the contract. // TODO: This should be replaced by the ExecutionState and NetworkInteraction.
 * @param isCustomError A boolean indicating if the JSON-RPC server error mentioned that the revert was due to a custom error.
 * @returns The execution error, or `undefined` if the call didn't fail.
 */
export async function decodeError(
  returnData: string,
  isCustomError: boolean,
  decodeCustomError: (
    returnData: string
  ) => Promise<CustomError | InvalidCustomError | undefined>
): Promise<ExecutionError> {
  if (returnData === "0x") {
    return { type: ExecutionErrorTypes.REVERT_WITHOUT_REASON };
  }

  const revertWithReasonError = tryToDecodeReason(returnData);
  if (revertWithReasonError !== undefined) {
    return revertWithReasonError;
  }

  const revertWithPanicCodeError = tryToDecodePanicCode(returnData);
  if (revertWithPanicCodeError !== undefined) {
    return revertWithPanicCodeError;
  }

  const decodedCustomError = await decodeCustomError(returnData);
  if (decodedCustomError !== undefined) {
    if (decodedCustomError.type === DecodingResultType.CUSTOM_ERROR) {
      return {
        type: ExecutionErrorTypes.REVERT_WITH_CUSTOM_ERROR,
        errorName: decodedCustomError.errorName,
        args: decodedCustomError.args,
      };
    }

    return {
      type: ExecutionErrorTypes.RETURNED_INVALIDA_DATA_EXECUTION_ERROR,
      data: returnData,
    };
  }

  if (isCustomError === true) {
    return {
      type: ExecutionErrorTypes.REVERT_WITH_UNKNOWN_CUSTOM_ERROR,
      signature: returnData.slice(0, 10),
      data: returnData,
    };
  }

  return {
    type: ExecutionErrorTypes.REVERT_WITH_INVALID_DATA_OR_UNKNOWN_CUSTOM_ERROR,
    signature: returnData.slice(0, 10),
    data: returnData,
  };
}

function tryToDecodeReason(
  returnData: string
):
  | RevertWithReasonExecutionError
  | RevertWithInvalidDataExecutionError
  | undefined {
  if (!returnData.startsWith(REVERT_REASON_SIGNATURE)) {
    return undefined;
  }

  const { ethers } = require("ethers") as typeof import("ethers");
  const abiCoder = ethers.AbiCoder.defaultAbiCoder();

  try {
    const [reason] = abiCoder.decode(
      ["string"],
      Buffer.from(returnData.slice(REVERT_REASON_SIGNATURE.length), "hex")
    );

    return {
      type: ExecutionErrorTypes.REVERT_WITH_REASON,
      message: reason,
    };
  } catch {
    return {
      type: ExecutionErrorTypes.REVERT_WITH_INVALID_DATA,
      data: returnData,
    };
  }
}

function tryToDecodePanicCode(
  returnData: string
):
  | RevertWithPanicCodeExecutionError
  | RevertWithInvalidDataExecutionError
  | undefined {
  if (!returnData.startsWith(PANIC_CODE_SIGNATURE)) {
    return undefined;
  }

  const { ethers } = require("ethers") as typeof import("ethers");
  const abiCoder = ethers.AbiCoder.defaultAbiCoder();

  try {
    const decoded = abiCoder.decode(
      ["uint256"],
      Buffer.from(returnData.slice(REVERT_REASON_SIGNATURE.length), "hex")
    );

    const panicCode = Number(decoded[0]);

    const panicCodeName = PANIC_CODE_NAMES[panicCode];

    if (panicCodeName === undefined) {
      return {
        type: ExecutionErrorTypes.REVERT_WITH_INVALID_DATA,
        data: returnData,
      };
    }

    return {
      type: ExecutionErrorTypes.REVERT_WITH_PANIC_CODE,
      panicCode,
      panicCodeName,
    };
  } catch {
    return {
      type: ExecutionErrorTypes.REVERT_WITH_INVALID_DATA,
      data: returnData,
    };
  }
}

function isInvalidReturnData(value: unknown): value is InvalidReturnData {
  return (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    value.type === DecodingResultType.INVALID_RETURN_DATA
  );
}
