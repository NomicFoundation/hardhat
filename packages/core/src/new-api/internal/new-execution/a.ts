import { Artifact } from "../../types/artifact";
import { assertIgnitionInvariant } from "../utils/assertions";
import {
  decodeArtifactCustomError,
  decodeArtifactFunctionCallResult,
  encodeArtifactDeploymentData,
  encodeArtifactFunctionCall,
} from "./abi";
import { decodeError } from "./error-decoding";
import {
  CallExecutionResult,
  CallExecutionState,
  DeploymentExecutionResult,
  DeploymentExecutionState,
  EvmExecutionResultTypes,
  EvmValues,
  ExecutionResultType,
  InvalidResultError,
  NetworkInteractionType,
  OnchainInteraction,
  RawStaticCallResult,
  RevertWithCustomError,
  RevertWithInvalidData,
  SendDataExecutionResult,
  SendDataExecutionState,
  SimulationErrorExecutionResult,
  StaticCall,
  StaticCallExecutionResult,
  StaticCallExecutionState,
  SuccessfulEvmExecutionResult,
  Transaction,
  TransactionReceiptStatus,
} from "./new-state-types";

export type LoadArtifactFunction = (
  artifactFutureId: string
) => Promise<Artifact>;

export type OnchainInteractionRequest = Omit<
  OnchainInteraction,
  "transactions" | "nonce"
>;

export enum OnchainInteractionResponseType {
  SUCCESSFUL_TRANSACTION = "SUCCESSFUL_TRANSACTION",
  SIMULATION_RESULT = "SIMULATION_RESULT",
}

export interface SuccessfulTransaction {
  type: OnchainInteractionResponseType.SUCCESSFUL_TRANSACTION;
  transaction: Required<Transaction> & {
    status: TransactionReceiptStatus.SUCCESS;
  };
}

export interface SimulationResult {
  type: OnchainInteractionResponseType.SIMULATION_RESULT;
  result: RawStaticCallResult;
}

export type OnchainInteractionResponse =
  | SuccessfulTransaction
  | SimulationResult;

const SIMULATION_SUCCESS_SIGNAL_TYPE = "SIMULATION_SUCCESS_SIGNAL" as const;

export type SimulationSuccessSignal = {
  type: typeof SIMULATION_SUCCESS_SIGNAL_TYPE;
};

export type StaticCallRequest = Omit<StaticCall, "result">;

export type StaticCallResponse = RawStaticCallResult;

export interface ExecutionStrategy {
  executeDeployment: (
    executionState: DeploymentExecutionState,
    fallbackSender: string,
    loadArtifact: LoadArtifactFunction
  ) => AsyncGenerator<
    OnchainInteractionRequest | SimulationSuccessSignal | StaticCallRequest,
    DeploymentExecutionResult,
    RawStaticCallResult | OnchainInteractionResponse
  >;

  executeCall: (
    executionState: CallExecutionState,
    fallbackSender: string,
    loadArtifact: LoadArtifactFunction
  ) => AsyncGenerator<
    OnchainInteractionRequest | SimulationSuccessSignal | StaticCallRequest,
    CallExecutionResult,
    RawStaticCallResult | OnchainInteractionResponse
  >;

  executeSendData: (
    executionState: SendDataExecutionState,
    fallbackSender: string
  ) => AsyncGenerator<
    OnchainInteractionRequest | SimulationSuccessSignal | StaticCallRequest,
    SendDataExecutionResult,
    RawStaticCallResult | OnchainInteractionResponse
  >;

  executeStaticCall: (
    executionState: StaticCallExecutionState,
    fallbackSender: string,
    loadArtifact: LoadArtifactFunction
  ) => AsyncGenerator<
    StaticCallRequest,
    StaticCallExecutionResult,
    StaticCallResponse
  >;
}

function isOnchainInteractionResponse(
  response: RawStaticCallResult | OnchainInteractionResponse
): response is OnchainInteractionResponse {
  return (
    "type" in response &&
    (response.type === OnchainInteractionResponseType.SUCCESSFUL_TRANSACTION ||
      response.type === OnchainInteractionResponseType.SIMULATION_RESULT)
  );
}

function isRawStaticCallResult(
  response: RawStaticCallResult | OnchainInteractionResponse
): response is RawStaticCallResult {
  return !isOnchainInteractionResponse(response);
}

class BasicExecutionStrategy implements ExecutionStrategy {
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
        data: await encodeArtifactFunctionCall(
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

  async *executeSendData(
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

  async *executeStaticCall(
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
      data: await encodeArtifactFunctionCall(
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
    assertionPrefix +
      "Expected onchain interaction response and got raw static call result"
  );

  assertIgnitionInvariant(
    simulationResponse.type ===
      OnchainInteractionResponseType.SIMULATION_RESULT,
    assertionPrefix +
      "Expected simulation result and got a successful transaction"
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
    type: SIMULATION_SUCCESS_SIGNAL_TYPE,
  };

  assertIgnitionInvariant(
    isOnchainInteractionResponse(onchainInteractionResponse),
    assertionPrefix +
      "Expected onchain interaction response and got raw static call result"
  );

  assertIgnitionInvariant(
    onchainInteractionResponse.type ===
      OnchainInteractionResponseType.SUCCESSFUL_TRANSACTION,
    assertionPrefix + "Expected confirmed transaction and got simulation result"
  );

  return onchainInteractionResponse;
}
