import {
  PANIC_CODE_NAMES,
  PANIC_CODE_SIGNATURE,
  REVERT_REASON_SIGNATURE,
} from "./constants";
import {
  EvmExecutionResultTypes,
  FailedEvmExecutionResult,
  RevertWithCustomError,
  RevertWithInvalidData,
  RevertWithPanicCode,
  RevertWithReason,
} from "./new-state-types";

export function decodeError(
  returnData: string,
  isCustomError: boolean,
  decodeCustomError?: (
    returnData: string
  ) => RevertWithCustomError | RevertWithInvalidData | undefined
): FailedEvmExecutionResult {
  if (returnData === "0x") {
    return { type: EvmExecutionResultTypes.REVERT_WITHOUT_REASON };
  }

  const revertWithReasonError = tryToDecodeReason(returnData);
  if (revertWithReasonError !== undefined) {
    return revertWithReasonError;
  }

  const revertWithPanicCodeError = tryToDecodePanicCode(returnData);
  if (revertWithPanicCodeError !== undefined) {
    return revertWithPanicCodeError;
  }

  if (decodeCustomError !== undefined) {
    const decodedCustomError = decodeCustomError(returnData);
    if (decodedCustomError !== undefined) {
      return decodedCustomError;
    }
  }

  if (isCustomError === true) {
    return {
      type: EvmExecutionResultTypes.REVERT_WITH_UNKNOWN_CUSTOM_ERROR,
      signature: returnData.slice(0, 10),
      data: returnData,
    };
  }

  return {
    type: EvmExecutionResultTypes.REVERT_WITH_INVALID_DATA_OR_UNKNOWN_CUSTOM_ERROR,
    signature: returnData.slice(0, 10),
    data: returnData,
  };
}

function tryToDecodeReason(
  returnData: string
): RevertWithReason | RevertWithInvalidData | undefined {
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
      type: EvmExecutionResultTypes.REVERT_WITH_REASON,
      message: reason,
    };
  } catch {
    return {
      type: EvmExecutionResultTypes.REVERT_WITH_INVALID_DATA,
      data: returnData,
    };
  }
}

function tryToDecodePanicCode(
  returnData: string
): RevertWithPanicCode | RevertWithInvalidData | undefined {
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

    const panicName = PANIC_CODE_NAMES[panicCode];

    if (panicName === undefined) {
      return {
        type: EvmExecutionResultTypes.REVERT_WITH_INVALID_DATA,
        data: returnData,
      };
    }

    return {
      type: EvmExecutionResultTypes.REVERT_WITH_PANIC_CODE,
      panicCode,
      panicName,
    };
  } catch {
    return {
      type: EvmExecutionResultTypes.REVERT_WITH_INVALID_DATA,
      data: returnData,
    };
  }
}
