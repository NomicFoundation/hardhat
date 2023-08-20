import type { Result, ParamType, FunctionFragment, Interface } from "ethers";

import {
  IgnitionValidationError,
  UnsupportedOperationError,
} from "../../../errors";
import { Artifact } from "../../types/artifact";
import { SolidityParameterType } from "../../types/module";
import { assertIgnitionInvariant } from "../utils/assertions";

import { linkLibraries } from "./libraries";
import {
  EvmExecutionResultTypes,
  EvmTuple,
  EvmValue,
  FailedEvmExecutionResult,
  InvalidResultError,
  RevertWithCustomError,
  RevertWithInvalidData,
  RevertWithPanicCode,
  RevertWithReason,
  SuccessfulEvmExecutionResult,
} from "./types/evm-execution";

const REVERT_REASON_SIGNATURE = "0x08c379a0";
const PANIC_CODE_SIGNATURE = "0x4e487b71";
const PANIC_CODE_NAMES: { [key: number]: string | undefined } = {
  [0x00]: "GENERIC_PANIC",
  [0x01]: "ASSERT_FALSE",
  [0x11]: "OVERFLOW",
  [0x12]: "DIVIDE_BY_ZERO",
  [0x21]: "ENUM_RANGE_ERROR",
  [0x22]: "BAD_STORAGE_DATA",
  [0x31]: "STACK_UNDERFLOW",
  [0x32]: "ARRAY_RANGE_ERROR",
  [0x41]: "OUT_OF_MEMORY",
  [0x51]: "UNINITIALIZED_FUNCTION_CALL",
};

/**
 * Links the libraries in the artifact's deployment bytecode, encodes the constructor
 * arguments and returns the result, which can be used as the `data` field of a
 * deployment.
 */
export function encodeArtifactDeploymentData(
  artifact: Artifact,
  args: SolidityParameterType[],
  libraries: { [libraryName: string]: string }
): string {
  const { ethers } = require("ethers") as typeof import("ethers");
  const iface = new ethers.Interface(artifact.abi);

  const linkedBytecode = linkLibraries(artifact, libraries);
  const encodedArgs = iface.encodeDeploy(args);

  return linkedBytecode + encodedArgs.slice(2);
}

/**
 * Encodes a function call for the given artifact and function name.
 */
export function encodeArtifactFunctionCall(
  artifact: Artifact,
  functionName: string,
  args: SolidityParameterType[]
): string {
  validateArtifactFunctionName(artifact, functionName);

  const { ethers } = require("ethers") as typeof import("ethers");
  const iface = new ethers.Interface(artifact.abi);

  const functionFragment = getFunctionFragment(iface, functionName);
  return iface.encodeFunctionData(functionFragment, args);
}

/**
 * Decodes a custom error from the given return data, if it's recognized
 * as one of the artifact's custom errors.
 */
export function decodeArtifactCustomError(
  artifact: Artifact,
  returnData: string
): RevertWithCustomError | RevertWithInvalidData | undefined {
  const { ethers } = require("ethers") as typeof import("ethers");
  const iface = ethers.Interface.from(artifact.abi);
  const errorFragment = iface.fragments
    .filter(ethers.Fragment.isError)
    .find((ef) => returnData.startsWith(ef.selector));

  if (errorFragment === undefined) {
    return undefined;
  }

  try {
    const decoded = iface.decodeErrorResult(errorFragment, returnData);

    return {
      type: EvmExecutionResultTypes.REVERT_WITH_CUSTOM_ERROR,
      errorName: errorFragment.name,
      args: ethersResultIntoEvmTuple(decoded, errorFragment.inputs),
    };
  } catch {
    return {
      type: EvmExecutionResultTypes.REVERT_WITH_INVALID_DATA,
      data: returnData,
    };
  }
}

/**
 * Decode the result of a successful function call.
 */
export function decodeArtifactFunctionCallResult(
  artifact: Artifact,
  functionName: string,
  returnData: string
): InvalidResultError | SuccessfulEvmExecutionResult {
  validateArtifactFunctionName(artifact, functionName);

  const { ethers } = require("ethers") as typeof import("ethers");
  const iface = ethers.Interface.from(artifact.abi);
  const functionFragment = getFunctionFragment(iface, functionName);

  try {
    const decoded = iface.decodeFunctionResult(functionFragment, returnData);
    const values = ethersResultIntoEvmTuple(decoded, functionFragment.outputs);

    return { type: EvmExecutionResultTypes.SUCESSFUL_RESULT, values };
  } catch {
    return {
      type: EvmExecutionResultTypes.INVALID_RESULT_ERROR,
      data: returnData,
    };
  }
}

/**
 * Validates that a function name is valid for the given artifact. That means:
 *  - It's a valid function name
 *  - The function name exists in the artifact's ABI
 *  - If the function is not overlaoded, its bare name is used.
 *  - If the function is overloaded, the function name is includes the argument types
 *    in parentheses.
 */
export function validateArtifactFunctionName(
  artifact: Artifact,
  functionName: string
) {
  const FUNCTION_NAME_REGEX = /^[_\\$a-zA-Z][_\\$a-zA-Z0-9]*(\(.*\))?$/;

  if (functionName.match(FUNCTION_NAME_REGEX) === null) {
    throw new IgnitionValidationError(
      `Invalid function name "${functionName}"`
    );
  }

  const bareFunctionName = functionName.includes("(")
    ? functionName.substring(0, functionName.indexOf("("))
    : functionName;

  const { ethers } = require("ethers") as typeof import("ethers");
  const iface = ethers.Interface.from(artifact.abi);
  const functionFragments = iface.fragments
    .filter(ethers.Fragment.isFunction)
    .filter((fragment) => fragment.name === bareFunctionName);

  if (functionFragments.length === 0) {
    throw new IgnitionValidationError(
      `Function "${functionName}" not found in contract ${artifact.contractName}`
    );
  }

  // If the function is not overloaded we force the user to use the bare function name
  // because having a single representation is more friendly with our reconciliation
  // process.
  if (functionFragments.length === 1) {
    if (bareFunctionName !== functionName) {
      throw new IgnitionValidationError(
        `Function name "${functionName}" used for contract ${artifact.contractName}, but it's not overloaded. Use "${bareFunctionName}" instead.`
      );
    }

    return;
  }

  const normalizedFunctionNames = functionFragments.map(
    getFunctionNameWithParams
  );

  const normalizedFunctionNameList = normalizedFunctionNames
    .map((nn) => `* ${nn}`)
    .join("\n");

  if (bareFunctionName === functionName) {
    throw new IgnitionValidationError(
      `Function name "${functionName}" is overloaded in contract ${artifact.contractName}. Please use one of these names instead:

${normalizedFunctionNameList}`
    );
  }

  if (!normalizedFunctionNames.includes(functionName)) {
    throw new IgnitionValidationError(
      `Function name "${functionName}" is not a valid overload of "${bareFunctionName}" in contract ${artifact.contractName}. Please use one of these names instead:

${normalizedFunctionNameList}`
    );
  }
}

/**
 * Decodes an error from a failed evm execution.
 *
 * @param returnData The data, as returned by the JSON-RPC.
 * @param customErrorReported A value indicating if the JSON-RPC error
 *  reported that it was due to a custom error.
 * @param decodeCustomError A function that decodes custom errors, returning
 *  `RevertWithCustomError` if succesfully decoded, `RevertWithInvalidData`
 *  if a custom error was recognized but couldn't be decoded, and `undefined`
 *  it it wasn't recognized.
 * @returns A `FailedEvmExecutionResult` with the decoded error.
 */
export function decodeError(
  returnData: string,
  customErrorReported: boolean,
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

  if (customErrorReported === true) {
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

function ethersValueIntoEvmValue(
  ethersValue: any,
  paramType: ParamType
): EvmValue {
  const { ethers } = require("ethers") as typeof import("ethers");

  if (typeof ethersValue === "bigint") {
    return ethersValue;
  }

  if (typeof ethersValue === "string") {
    return ethersValue;
  }

  if (typeof ethersValue === "number") {
    return BigInt(ethersValue);
  }

  if (typeof ethersValue === "boolean") {
    return ethersValue;
  }

  if (ethersValue instanceof ethers.Result) {
    if (paramType.baseType === "array") {
      assertIgnitionInvariant(
        paramType.arrayChildren !== null,
        `[ethers.js values decoding] arrayChildren must be defined for array ${paramType.type}`
      );

      return ethersResultIntoEvmValueArray(
        ethersValue,
        paramType.arrayChildren
      );
    }

    assertIgnitionInvariant(
      paramType.components !== null,
      `[ethers.js values decoding] components must be defined for tuple ${paramType.type}`
    );

    return ethersResultIntoEvmTuple(ethersValue, paramType.components);
  }

  throw new UnsupportedOperationError(
    `Ignition can't decode ethers.js value of type ${
      paramType.type
    }: ${JSON.stringify(ethersValue, undefined, 2)}`
  );
}

function ethersResultIntoEvmValueArray(
  result: Result,
  elementParamType: ParamType
): EvmValue[] {
  return Array.from(result).map((ethersValue) =>
    ethersValueIntoEvmValue(ethersValue, elementParamType)
  );
}

function ethersResultIntoEvmTuple(
  result: Result,
  paramsParamType: readonly ParamType[]
): EvmTuple {
  const positional: EvmValue[] = [];
  const named: Record<string, EvmValue> = {};

  for (const [i, param] of paramsParamType.entries()) {
    const transformedValue = ethersValueIntoEvmValue(result[i], param);

    positional[i] = transformedValue;

    if (param.name !== "") {
      named[param.name] = transformedValue;
    }
  }

  return { positional, named };
}

/**
 * Returns a function fragment for the given function name in the given artifact.
 *
 * @param artifact The artifact to search in.
 * @param functionName The function name to search for. MUST be validated first.
 */
function getFunctionFragment(
  iface: Interface,
  functionName: string
): FunctionFragment {
  const { ethers } = require("ethers") as typeof import("ethers");

  const fragment = iface.fragments
    .filter(ethers.Fragment.isFunction)
    .find(
      (fr) =>
        fr.name === functionName ||
        getFunctionNameWithParams(fr) === functionName
    );

  assertIgnitionInvariant(
    fragment !== undefined,
    "Called getFunctionFragment with an invalid function name"
  );

  return fragment;
}

function getFunctionNameWithParams(functionFragment: FunctionFragment): string {
  return functionFragment.format("sighash");
}
