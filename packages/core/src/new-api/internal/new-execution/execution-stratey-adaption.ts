///////////////////////////////////////////////////////////////////////////////
///                             EXPLANATION                                 ///
///////////////////////////////////////////////////////////////////////////////
///
/// This file contains the subset of the execution strategy that needs to be
/// adapted to handle errors.
///////////////////////////////////////////////////////////////////////////////

import { Artifact } from "../../types/artifact";
import { NetworkInteraction } from "../execution/transaction-types";
import {
  CallExecutionState,
  DeploymentExecutionState,
  SendDataExecutionState,
  StaticCallExecutionState,
} from "../execution/types";
import { ExecutionResult } from "./execution-results";

export enum DecodingResultType {
  INVALID_RETURN_DATA = "INVALID_RETURN_DATA",
  CUSTOM_ERROR = "CUSTOM_ERROR",
  INVALID_CUSTOM_ERROR = "INVALID_CUSTOM_ERROR",
}

export interface InvalidReturnData {
  type: DecodingResultType.INVALID_RETURN_DATA;
}

export interface CustomError {
  type: DecodingResultType.CUSTOM_ERROR;
  errorName: string;
  args: ExecutionResult;
}

export interface InvalidCustomError {
  type: DecodingResultType.INVALID_CUSTOM_ERROR;
}

export type LoadArtifactFunction = (
  storedArtifactId: string
) => Promise<Artifact>;

export interface ExecutionStrategy {
  /**
   * Decodes the result of a successful execution of a network interaction.
   *
   * If the network interaction is a StaticCall, this method will be called with
   * the result of having run eth_call. If the network interaction is an OnchainInteraction,
   * this method will be called with the result of having run a simulation of the transaction.
   *
   * This method should return the decoded result of the execution, or an
   * object indicating that the the data was invalid.
   *
   * This function is not called for network interactions that are deployments (i.e. with `to` set to
   * `undefined`), as their return data is not relevant.
   *
   * @param executionState The execution state that's being executed.
   * @param networkInteraction The network interaction that was executed.
   * @param returnData The data returned by the execution.
   */
  decodeNetworkInteractionResult(
    executionState:
      | DeploymentExecutionState
      | CallExecutionState
      | StaticCallExecutionState
      | SendDataExecutionState,
    networkInteraction: NetworkInteraction,
    returnData: string,
    loadArtifact: LoadArtifactFunction
  ): Promise<InvalidReturnData | ExecutionResult>;

  /**
   * This method tries to decode a custom error that was returned by the failed
   * execution of a network interaction.
   *
   * If the network interaction is a StaticCall, this method will be called with
   * the result of having run eth_call. If the network interaction is an OnchainInteraction,
   * this method will be called with the result of having run a simulation of the transaction.
   *
   * This method should only care about custom errors, and not other kinds of errors.
   *
   * If the returnData doesn't start with a signature of a custom error that this
   * execution strategy knows how to decode, this method should return `undefined`.
   *
   * If the signature is recognized, and the custom error is succcessfully decoded,
   * this method should return a CustomError object.
   *
   * If the signature is recognized, but the custom error can't be decoded, this
   * method should return an InvalidCustomError object.
   *
   *
   * @param executionState The execution state that's being executed.
   * @param networkInteraction The network interaction that was executed.
   * @param returnData The data returned by the execution.
   */
  decodeCustomError(
    executionState:
      | DeploymentExecutionState
      | CallExecutionState
      | SendDataExecutionState
      | StaticCallExecutionState,
    networkInteraction: NetworkInteraction,
    returnData: string,
    loadArtifact: LoadArtifactFunction
  ): Promise<CustomError | InvalidCustomError | undefined>;
}
