/**
 * This is a file containing the different helpers that an execution strategy
 * implementation can use.
 * @file
 */

import { assertIgnitionInvariant } from "../utils/assertions";

import { decodeError } from "./error-decoding";
import {
  RevertWithCustomError,
  RevertWithInvalidData,
  InvalidResultError,
  SuccessfulEvmExecutionResult,
  EvmExecutionResultTypes,
} from "./types/evm-execution";
import {
  ExecutionResultType,
  FailedStaticCallExecutionResult,
} from "./types/execution-result";
import {
  OnchainInteractionRequest,
  OnchainInteractionResponse,
  OnchainInteractionResponseType,
  SimulationError,
  SimulationSuccessSignal,
  StaticCallRequest,
  StaticCallResponse,
  SuccessfulTransaction,
} from "./types/execution-strategy";

/**
 * Returns true if the given response is an onchain interaction response.
 */
export function isOnchainInteractionResponse(
  response: StaticCallResponse | OnchainInteractionResponse
): response is OnchainInteractionResponse {
  return (
    "type" in response &&
    (response.type === OnchainInteractionResponseType.SUCCESSFUL_TRANSACTION ||
      response.type === OnchainInteractionResponseType.SIMULATION_RESULT)
  );
}

/**
 * A function that decodes custom errors.
 *
 * @param returnData The return data of an evm execution, as returned by the JSON-RPC.
 * @returns `RevertWithCustomError` if a custom error was successfully decoded. `RevertWithInvalidData`
 *  if the custom error is recognized but the return data was invalid. `undefined` no custom error was
 *  recognized.
 */
export type DecodeCustomError = (
  returnData: string
) => RevertWithCustomError | RevertWithInvalidData | undefined;

/**
 * A function that decodes the succesful result of an evm execution.
 * @param returnData The return data of an evm execution, as returned by the JSON-RPC.
 * @returns `InvalidResultError` if the result is invalid wrt to the contract's ABI.
 *  `SuccessfulEvmExecutionResult` if the result can be decoded.
 */
export type DecodeSuccessfulExecutionResult = (
  returnData: string
) => InvalidResultError | SuccessfulEvmExecutionResult;

/**
 * Executes an onchain interaction request.
 *
 * @param executionStateId The id of the execution state that lead to the request.
 * @param onchainInteractionRequest  The request to execute.
 * @param decodeSuccessfulSimulationResult A function to decode the results of a
 *  simulation. Can be `undefined` if the request is not related to a contract or
 *  if we want to accept any result (e.g. in a deployment).
 * @param decodeCustomError A function to decode custom errors. Can be `undefined`
 *  if the request is not related to a contract whose custom errors we know how to
 *  decode.
 * @returns The successful transaction response or a simulation error.
 */
export async function* executeOnchainInteractionRequest(
  executionStateId: string,
  onchainInteractionRequest: OnchainInteractionRequest,
  decodeSuccessfulSimulationResult?: DecodeSuccessfulExecutionResult,
  decodeCustomError?: DecodeCustomError
): AsyncGenerator<
  OnchainInteractionRequest | SimulationSuccessSignal,
  SuccessfulTransaction | SimulationError,
  OnchainInteractionResponse | StaticCallResponse
> {
  const simulationResponse = yield onchainInteractionRequest;

  const assertionPrefix = `[ExecutionState ${executionStateId} - Network Interaction ${onchainInteractionRequest.id}] `;

  assertIgnitionInvariant(
    isOnchainInteractionResponse(simulationResponse),
    `${assertionPrefix}Expected onchain interaction response and got raw static call result`
  );

  assertIgnitionInvariant(
    simulationResponse.type ===
      OnchainInteractionResponseType.SIMULATION_RESULT,
    `${assertionPrefix}Expected simulation result and got a successful transaction`
  );

  if (!simulationResponse.result.success) {
    return decodeError(
      simulationResponse.result.returnData,
      simulationResponse.result.customErrorReported,
      decodeCustomError
    );
  }

  if (decodeSuccessfulSimulationResult !== undefined) {
    const result = decodeSuccessfulSimulationResult(
      simulationResponse.result.returnData
    );

    if (result.type === EvmExecutionResultTypes.INVALID_RESULT_ERROR) {
      return result;
    }
  }

  const onchainInteractionResponse = yield {
    type: "SIMULATION_SUCCESS_SIGNAL",
  };

  assertIgnitionInvariant(
    isOnchainInteractionResponse(onchainInteractionResponse),
    `${assertionPrefix}Expected onchain interaction response and got raw static call result`
  );

  assertIgnitionInvariant(
    onchainInteractionResponse.type ===
      OnchainInteractionResponseType.SUCCESSFUL_TRANSACTION,
    `${assertionPrefix}Expected confirmed transaction and got simulation result`
  );

  return onchainInteractionResponse;
}

/**
 * Executes an static call request.
 *
 * @param staticCallRequest  The static call request to execute.
 * @param decodeSuccessfulResult A function to decode the results of a simulation.
 * @param decodeCustomError A function to decode custom errors.
 * @returns The successful evm execution result, or a failed static call result.
 */
export async function* executeStaticCallRequest(
  staticCallRequest: StaticCallRequest,
  decodeSuccessfulResult: DecodeSuccessfulExecutionResult,
  decodeCustomError: DecodeCustomError
): AsyncGenerator<
  StaticCallRequest,
  SuccessfulEvmExecutionResult | FailedStaticCallExecutionResult,
  StaticCallResponse
> {
  const result = yield staticCallRequest;

  if (!result.success) {
    const error = decodeError(
      result.returnData,
      result.customErrorReported,
      decodeCustomError
    );

    return {
      type: ExecutionResultType.STATIC_CALL_ERROR,
      error,
    };
  }

  const decodedResult = decodeSuccessfulResult(result.returnData);

  if (decodedResult.type === EvmExecutionResultTypes.INVALID_RESULT_ERROR) {
    return {
      type: ExecutionResultType.STATIC_CALL_ERROR,
      error: decodedResult,
    };
  }

  return decodedResult;
}

export * from "./error-decoding";
export * from "./abi";
