///////////////////////////////////////////////////////////////////////////////
///                             EXPLANATION                                 ///
///////////////////////////////////////////////////////////////////////////////
///
/// This file contains the adaptions required for the basic execution strategy.
///
/// See execution-strategy-adaption.ts first.
///////////////////////////////////////////////////////////////////////////////

import type { Result } from "ethers";
import { SolidityParameterType } from "../../types/module";
import { NetworkInteraction } from "../execution/transaction-types";
import {
  CallExecutionState,
  DeploymentExecutionState,
  SendDataExecutionState,
  StaticCallExecutionState,
} from "../execution/types";
import {
  isDeploymentExecutionState,
  isSendDataExecutionState,
} from "../type-guards";
import { assertIgnitionInvariant } from "../utils/assertions";
import { ExecutionResult } from "./execution-results";
import {
  CustomError,
  DecodingResultType,
  ExecutionStrategy,
  InvalidCustomError,
  InvalidReturnData,
  LoadArtifactFunction,
} from "./execution-stratey-adaption";

export class BasicExecutionStrategy implements ExecutionStrategy {
  async decodeNetworkInteractionResult(
    executionState:
      | DeploymentExecutionState
      | CallExecutionState
      | StaticCallExecutionState
      | SendDataExecutionState,
    networkInteraction: NetworkInteraction,
    returnData: string,
    loadArtifact: LoadArtifactFunction
  ): Promise<ExecutionResult | InvalidReturnData> {
    // We don't decode results of arbitrary sends
    if (isSendDataExecutionState(executionState)) {
      return { named: {}, numbered: [] };
    }

    const { abi } = await loadArtifact(executionState.artifactFutureId);

    assertIgnitionInvariant(
      !isDeploymentExecutionState(executionState),
      "Trying to decode the result of a deployment transaction"
    );

    const functionName = executionState.functionName;

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
      return ethersResultIntoExecutionResults(
        decoded,
        functionFragment.outputs
          .map((output) => output.name)
          .filter((name) => name !== "")
      );
    } catch {
      return { type: DecodingResultType.INVALID_RETURN_DATA };
    }
  }

  async decodeCustomError(
    executionState:
      | DeploymentExecutionState
      | CallExecutionState
      | StaticCallExecutionState,
    networkInteraction: NetworkInteraction,
    returnData: string,
    loadArtifact: LoadArtifactFunction
  ): Promise<CustomError | InvalidCustomError | undefined> {
    const { abi } = await loadArtifact(executionState.artifactFutureId);

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
        type: DecodingResultType.CUSTOM_ERROR,
        errorName: errorFragment.name,
        args: ethersResultIntoExecutionResults(
          decoded,
          errorFragment.inputs
            .map((input) => input.name)
            .filter((name) => name !== "")
        ),
      };
    } catch {
      return {
        type: DecodingResultType.INVALID_CUSTOM_ERROR,
      };
    }
  }
}

function ethersResultIntoExecutionResults(
  result: Result,
  names: string[]
): ExecutionResult {
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
        (value): value is [string, SolidityParameterType] =>
          !(value instanceof Error)
      )
  );

  return { numbered, named };
}
