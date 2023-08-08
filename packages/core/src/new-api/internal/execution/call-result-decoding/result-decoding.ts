import { Result } from "ethers";
import {
  PANIC_CODE_NAMES,
  PANIC_CODE_SIGNATURE,
  REVERT_REASON_SIGNATURE,
} from "./constants";

export type SolidityArgumentType = any;

/**
 * The results returned by Solidity either as a function result, or as
 * custom error parameters.
 */
interface SolidityResults {
  named: Record<string, SolidityArgumentType>;
  numbered: SolidityArgumentType[];
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
  args: SolidityResults;
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
 * This function decodes a successful result of having run eth_call.
 *
 * @param returnData The return data of the execution, as encoded in the JSON-RPC response.
 * @param abi The ABI of the contract. // TODO: This and the following should be replaced by the ExecutionState and NetworkInteraction.
 * @param functionName The function name
 * @returns An object with the decoded result, or undefined if it failed to be decoded.
 */
export function decodeResult(
  returnData: string,
  abi: any,
  functionName: string
): ReturnedInvalidDataExecutionError | SolidityResults {
  const { ethers } = require("ethers") as typeof import("ethers");
  const iface = ethers.Interface.from(abi);
  const functionFragment = iface.fragments
    .filter(ethers.Fragment.isFunction)
    .find((fragment) => fragment.name === functionName);

  if (functionFragment === undefined) {
    throw new Error(`Function ${functionName} not found in ABI`);
  }

  try {
    const decoded = iface.decodeFunctionResult(functionFragment, returnData);
    return ethersResultIntoSolidityResults(
      decoded,
      functionFragment.outputs
        .map((output) => output.name)
        .filter((name) => name !== "")
    );
  } catch {
    return {
      type: ExecutionErrorTypes.RETURNED_INVALIDA_DATA_EXECUTION_ERROR,
      data: returnData,
    };
  }
}

export function isReturnedInvalidDataExecutionError(
  result: ReturnedInvalidDataExecutionError | SolidityArgumentType
): result is ReturnedInvalidDataExecutionError {
  return (
    "type" in result &&
    result.type === ExecutionErrorTypes.RETURNED_INVALIDA_DATA_EXECUTION_ERROR
  );
}

/**
 * Decodes an execution error that happened when running an eth_call.
 *
 * @param returnData The return data of the execution, as encoded in the JSON-RPC response.
 * @param abi The ABI of the contract. // TODO: This should be replaced by the ExecutionState and NetworkInteraction.
 * @param isCustomError A boolean indicating if the JSON-RPC server error mentioned that the revert was due to a custom error.
 * @returns The execution error, or `undefined` if the call didn't fail.
 */
export function decodeError(
  returnData: string,
  abi: any,
  isCustomError: boolean
): ExecutionError | undefined {
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

  const customError = tryToDecodeCustomError(returnData, abi);
  if (customError !== undefined) {
    return customError;
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

function tryToDecodeCustomError(
  returnData: string,
  abi: any[]
):
  | RevertWithCustomErrorExecutionError
  | RevertWithInvalidDataExecutionError
  | undefined {
  const { ethers } = require("ethers") as typeof import("ethers");
  const iface = ethers.Interface.from(abi);
  const errorFragment = iface.fragments
    .filter(ethers.Fragment.isError)
    .find((ef) => returnData.startsWith(ef.selector));

  if (errorFragment === undefined) {
    return undefined;
  }

  try {
    const decoded = iface.decodeErrorResult(errorFragment, returnData);

    return {
      type: ExecutionErrorTypes.REVERT_WITH_CUSTOM_ERROR,
      errorName: errorFragment.name,
      args: ethersResultIntoSolidityResults(
        decoded,
        errorFragment.inputs
          .map((input) => input.name)
          .filter((name) => name !== "")
      ),
    };
  } catch {
    return {
      type: ExecutionErrorTypes.REVERT_WITH_INVALID_DATA,
      data: returnData,
    };
  }
}

function ethersResultIntoSolidityResults(
  result: Result,
  names: string[]
): SolidityResults {
  const numbered = Array.from(result);

  const named = Object.fromEntries(
    names
      .map((name) => {
        try {
          return [name, result.getValue(name)];
        } catch (error) {
          return error;
        }
      })
      .filter(
        (value): value is [string, SolidityArgumentType] =>
          !(value instanceof Error)
      )
  );

  return { numbered, named };
}
