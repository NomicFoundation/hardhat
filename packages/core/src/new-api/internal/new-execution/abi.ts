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
  InvalidResultError,
  RevertWithCustomError,
  RevertWithInvalidData,
  SuccessfulEvmExecutionResult,
} from "./types/evm-execution";

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
