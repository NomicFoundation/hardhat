import type { Result } from "ethers";
import { Artifact } from "../../types/artifact";
import { SolidityParameterType } from "../../types/module";
import { collectLibrariesAndLink } from "../utils/collectLibrariesAndLink";
import {
  EvmExecutionResultTypes,
  EvmValues,
  InvalidResultError,
  RevertWithCustomError,
  RevertWithInvalidData,
  SuccessfulEvmExecutionResult,
} from "./new-state-types";

// TODO: This should be sync, it's only async because of collectLibrariesAndLink
export async function encodeArtifactDeploymentData(
  artifact: Artifact,
  args: SolidityParameterType[],
  libraries: { [libraryName: string]: string }
): Promise<string> {
  const { ethers } = require("ethers") as typeof import("ethers");
  const iface = new ethers.Interface(artifact.abi);

  const linkedBytecode = await collectLibrariesAndLink(artifact, libraries);
  const encodedArgs = iface.encodeDeploy(args);

  return linkedBytecode + encodedArgs.slice(2);
}

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
      args: ethersResultIntoEvmValues(
        decoded,
        errorFragment.inputs
          .map((input) => input.name)
          .filter((name) => name !== "")
      ),
    };
  } catch {
    return {
      type: EvmExecutionResultTypes.REVERT_WITH_INVALID_DATA,
      data: returnData,
    };
  }
}

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
    const values = ethersResultIntoEvmValues(
      decoded,
      functionFragment.outputs
        .map((output) => output.name)
        .filter((name) => name !== "")
    );

    return { type: EvmExecutionResultTypes.SUCESSFUL_RESULT, values };
  } catch {
    return {
      type: EvmExecutionResultTypes.INVALID_RESULT_ERROR,
      data: returnData,
    };
  }
}

function ethersResultIntoEvmValues(result: Result, names: string[]): EvmValues {
  const positional = Array.from(result);

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
        (value): value is [string, SolidityParameterType] =>
          !(value instanceof Error)
      )
  );

  return { positional, named };
}
