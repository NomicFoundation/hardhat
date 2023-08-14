import type { Result, ParamType } from "ethers";

import { IgnitionError } from "../../../errors";
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
// TODO: This should be sync, it's only async because of collectLibrariesAndLink
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
// TODO: Handle overloads
export function encodeArtifactFunctionCall(
  artifact: Artifact,
  functionName: string,
  args: SolidityParameterType[]
): string {
  const { ethers } = require("ethers") as typeof import("ethers");
  const iface = new ethers.Interface(artifact.abi);
  return iface.encodeFunctionData(functionName, args);
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
  const { ethers } = require("ethers") as typeof import("ethers");
  const iface = ethers.Interface.from(artifact.abi);
  const functionFragment = iface.fragments
    .filter(ethers.Fragment.isFunction)
    .find((fragment) => fragment.name === functionName);

  if (functionFragment === undefined) {
    throw new Error(`Function ${functionName} not found in ABI`);
  }

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
        "Components must be defined for tuples"
      );
      return ethersResultIntoEvmValueArray(
        ethersValue,
        paramType.arrayChildren
      );
    }

    assertIgnitionInvariant(
      paramType.components !== null,
      "Components must be defined for tuples"
    );

    return ethersResultIntoEvmTuple(ethersValue, paramType.components);
  }

  throw new IgnitionError(
    `Can't decode ethers value into our own type: ${typeof ethersValue}`
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
