import { assertIgnitionInvariant } from "../utils/assertions";

import {
  decodeArtifactCustomError,
  decodeArtifactFunctionCallResult,
  encodeArtifactDeploymentData,
  encodeArtifactFunctionCall,
} from "./abi";
import { decodeError } from "./error-decoding";
import {
  EvmExecutionResultTypes,
  InvalidResultError,
  RevertWithCustomError,
  RevertWithInvalidData,
  SuccessfulEvmExecutionResult,
} from "./types/evm-execution";
import {
  CallExecutionResult,
  DeploymentExecutionResult,
  ExecutionResultType,
  SendDataExecutionResult,
  SimulationErrorExecutionResult,
  StaticCallExecutionResult,
} from "./types/execution-result";
import {
  CallExecutionState,
  DeploymentExecutionState,
  SendDataExecutionState,
  StaticCallExecutionState,
} from "./types/execution-state";
import {
  OnchainInteractionResponse,
  OnchainInteractionResponseType,
  LoadArtifactFunction,
  OnchainInteractionRequest,
  SimulationSuccessSignal,
  StaticCallRequest,
  StaticCallResponse,
  SuccessfulTransaction,
  ExecutionStrategy,
} from "./types/execution-strategy";
import { RawStaticCallResult } from "./types/jsonrpc";
import { NetworkInteractionType } from "./types/network-interaction";

function isOnchainInteractionResponse(
  response: RawStaticCallResult | OnchainInteractionResponse
): response is OnchainInteractionResponse {
  return (
    "type" in response &&
    (response.type === OnchainInteractionResponseType.SUCCESSFUL_TRANSACTION ||
      response.type === OnchainInteractionResponseType.SIMULATION_RESULT)
  );
}

export class BasicExecutionStrategy implements ExecutionStrategy {
  public async *executeDeployment(
    executionState: DeploymentExecutionState,
    fallbackSender: string,
    loadArtifact: LoadArtifactFunction
  ): AsyncGenerator<
    OnchainInteractionRequest | SimulationSuccessSignal | StaticCallRequest,
    DeploymentExecutionResult,
    RawStaticCallResult | OnchainInteractionResponse
  > {
    const artifact = await loadArtifact(executionState.artifactFutureId);

    const transactionOrResult = yield* executeOnchainInteraction(
      executionState.id,
      {
        id: 1,
        type: NetworkInteractionType.ONCHAIN_INTERACTION,
        to: undefined,
        from: executionState.from ?? fallbackSender,
        data: await encodeArtifactDeploymentData(
          artifact,
          executionState.constructorArgs,
          executionState.libraries
        ),
        value: executionState.value,
      },
      (returnData) => decodeArtifactCustomError(artifact, returnData)
    );

    if (transactionOrResult.type === ExecutionResultType.SIMULATION_ERROR) {
      return transactionOrResult;
    }

    const tx = transactionOrResult.transaction;
    const contractAddress = tx.receipt.contractAddress;

    if (contractAddress === null) {
      return {
        type: ExecutionResultType.STRATEGY_ERROR,
        error: `Transaction ${tx.hash} confirmed but it didn't create a contract`,
      };
    }

    return {
      type: ExecutionResultType.SUCCESS,
      address: contractAddress,
    };
  }

  public async *executeCall(
    executionState: CallExecutionState,
    fallbackSender: string,
    loadArtifact: LoadArtifactFunction
  ): AsyncGenerator<
    OnchainInteractionRequest | SimulationSuccessSignal | StaticCallRequest,
    CallExecutionResult,
    RawStaticCallResult | OnchainInteractionResponse
  > {
    const artifact = await loadArtifact(executionState.artifactFutureId);

    const transactionOrResult = yield* executeOnchainInteraction(
      executionState.id,
      {
        id: 1,
        type: NetworkInteractionType.ONCHAIN_INTERACTION,
        to: undefined,
        from: executionState.from ?? fallbackSender,
        data: encodeArtifactFunctionCall(
          artifact,
          executionState.functionName,
          executionState.args
        ),
        value: executionState.value,
      },
      (returnData) => decodeArtifactCustomError(artifact, returnData),
      (returnData) =>
        decodeArtifactFunctionCallResult(
          artifact,
          executionState.functionName,
          returnData
        )
    );

    if (transactionOrResult.type === ExecutionResultType.SIMULATION_ERROR) {
      return transactionOrResult;
    }

    return {
      type: ExecutionResultType.SUCCESS,
    };
  }

  public async *executeSendData(
    executionState: SendDataExecutionState,
    fallbackSender: string
  ): AsyncGenerator<
    OnchainInteractionRequest | SimulationSuccessSignal | StaticCallRequest,
    SendDataExecutionResult,
    RawStaticCallResult | OnchainInteractionResponse
  > {
    const transactionOrResult = yield* executeOnchainInteraction(
      executionState.id,
      {
        id: 1,
        type: NetworkInteractionType.ONCHAIN_INTERACTION,
        to: undefined,
        from: executionState.from ?? fallbackSender,
        data: executionState.data,
        value: executionState.value,
      }
    );

    if (transactionOrResult.type === ExecutionResultType.SIMULATION_ERROR) {
      return transactionOrResult;
    }

    return {
      type: ExecutionResultType.SUCCESS,
    };
  }

  public async *executeStaticCall(
    executionState: StaticCallExecutionState,
    fallbackSender: string,
    loadArtifact: LoadArtifactFunction
  ): AsyncGenerator<
    StaticCallRequest,
    StaticCallExecutionResult,
    StaticCallResponse
  > {
    const artifact = await loadArtifact(executionState.artifactFutureId);

    const staticCallRequest: StaticCallRequest = {
      id: 1,
      type: NetworkInteractionType.STATIC_CALL,
      to: executionState.contractAddress,
      from: executionState.from ?? fallbackSender,
      data: encodeArtifactFunctionCall(
        artifact,
        executionState.functionName,
        executionState.args
      ),
      value: 0n,
    };

    const result = yield staticCallRequest;

    if (!result.success) {
      const error = decodeError(
        result.returnData,
        result.customErrorReported,
        (returnData) => decodeArtifactCustomError(artifact, returnData)
      );

      return {
        type: ExecutionResultType.STATIC_CALL_ERROR,
        error,
      };
    }

    const decodedResult = decodeArtifactFunctionCallResult(
      artifact,
      executionState.functionName,
      result.returnData
    );

    if (decodedResult.type === EvmExecutionResultTypes.INVALID_RESULT_ERROR) {
      return {
        type: ExecutionResultType.STATIC_CALL_ERROR,
        error: decodedResult,
      };
    }

    return {
      type: ExecutionResultType.SUCCESS,
      result: decodedResult,
    };
  }
}

async function* executeOnchainInteraction(
  executionStateId: string,
  onchainInteractionRequest: OnchainInteractionRequest,
  decodeCustomError?: (
    returnData: string
  ) => RevertWithCustomError | RevertWithInvalidData | undefined,
  decodeSuccessfulSimulationResult?: (
    returnData: string
  ) => InvalidResultError | SuccessfulEvmExecutionResult
): AsyncGenerator<
  OnchainInteractionRequest | SimulationSuccessSignal,
  SuccessfulTransaction | SimulationErrorExecutionResult,
  RawStaticCallResult | OnchainInteractionResponse
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
    const error = decodeError(
      simulationResponse.result.returnData,
      simulationResponse.result.customErrorReported,
      decodeCustomError
    );

    return {
      type: ExecutionResultType.SIMULATION_ERROR,
      error,
    };
  }

  if (decodeSuccessfulSimulationResult !== undefined) {
    const result = decodeSuccessfulSimulationResult(
      simulationResponse.result.returnData
    );

    if (result.type === EvmExecutionResultTypes.INVALID_RESULT_ERROR) {
      return {
        type: ExecutionResultType.SIMULATION_ERROR,
        error: result,
      };
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
