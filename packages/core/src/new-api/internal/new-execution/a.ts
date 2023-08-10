import { SolidityParameterType } from "../../types/module";
import { assertIgnitionInvariant } from "../utils/assertions";
import {
  CallExecutionResult,
  CallExecutionState,
  DeploymentExecutionResult,
  DeploymentExecutionState,
  EvmExecutionResultTypes,
  ExecutionResultType,
  FailedEvmExecutionResult,
  InvalidResultError,
  OnchainInteraction,
  RawStaticCallResult,
  SendDataExecutionResult,
  SendDataExecutionState,
  StaticCall,
  StaticCallExecutionResult,
  StaticCallExecutionState,
  SuccessfulEvmExecutionResult,
  Transaction,
  TransactionReceiptStatus,
} from "./new-state-types";

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
    fallbackSender: string
  ) => AsyncGenerator<
    OnchainInteractionRequest | SimulationSuccessSignal | StaticCallRequest,
    DeploymentExecutionResult,
    RawStaticCallResult | OnchainInteractionResponse
  >;

  executeCall: (
    executionState: CallExecutionState,
    fallbackSender: string
  ) => AsyncGenerator<
    OnchainInteractionRequest | SimulationSuccessSignal | StaticCallRequest,
    CallExecutionResult,
    RawStaticCallResult | OnchainInteractionResponse
  >;

  executeStaticCall: (
    executionState: StaticCallExecutionState,
    fallbackSender: string
  ) => AsyncGenerator<
    StaticCallRequest,
    StaticCallExecutionResult,
    StaticCallResponse
  >;

  executeSendData: (
    executionState: SendDataExecutionState,
    fallbackSender: string
  ) => AsyncGenerator<
    OnchainInteractionRequest | SimulationSuccessSignal | StaticCallRequest,
    SendDataExecutionResult,
    RawStaticCallResult | OnchainInteractionResponse
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
    fallbackSender: string
  ): AsyncGenerator<
    OnchainInteractionRequest | SimulationSuccessSignal | StaticCallRequest,
    DeploymentExecutionResult,
    RawStaticCallResult | OnchainInteractionResponse
  > {
    const simulationResponse = yield null as any as OnchainInteractionRequest;

    assertIgnitionInvariant(
      isOnchainInteractionResponse(simulationResponse),
      "Expected onchain interaction response and got raw static call result"
    );

    assertIgnitionInvariant(
      simulationResponse.type ===
        OnchainInteractionResponseType.SIMULATION_RESULT,
      "Expected simulation result and got confirmed transaction"
    );

    if (!simulationResponse.result.success) {
      const error = {} as any as FailedEvmExecutionResult;
      return {
        type: ExecutionResultType.SIMULATION_ERROR,
        error,
      };
    }

    const decodedSimulationResult = {} as any as
      | SuccessfulEvmExecutionResult
      | InvalidResultError;

    if (
      decodedSimulationResult.type ===
      EvmExecutionResultTypes.INVALID_RESULT_ERROR
    ) {
      return {
        type: ExecutionResultType.SIMULATION_ERROR,
        error: decodedSimulationResult,
      };
    }

    const onchainInteractionResponse = yield {
      type: SIMULATION_SUCCESS_SIGNAL_TYPE,
    };

    assertIgnitionInvariant(
      isOnchainInteractionResponse(onchainInteractionResponse),
      "Expected onchain interaction response and got raw static call result"
    );

    assertIgnitionInvariant(
      onchainInteractionResponse.type ===
        OnchainInteractionResponseType.SUCCESSFUL_TRANSACTION,
      "Expected confirmed transaction and got simulation result"
    );

    const tx = onchainInteractionResponse.transaction;
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

  executeCall: (
    executionState: CallExecutionState,
    fallbackSender: string
  ) => AsyncGenerator<
    OnchainInteractionRequest | StaticCallRequest,
    RawStaticCallResult | OnchainInteractionResponse,
    CallExecutionResult
  >;

  async *executeStaticCall(
    executionState: StaticCallExecutionState,
    fallbackSender: string
  ): AsyncGenerator<
    StaticCallRequest,
    StaticCallExecutionResult,
    StaticCallResponse
  > {
    const result = yield null as any as StaticCallRequest;

    if (!result.success) {
      const error = {} as any as FailedEvmExecutionResult;
      return {
        type: ExecutionResultType.STATIC_CALL_ERROR,
        error,
      };
    }

    const decodedResult = {} as any as
      | SuccessfulEvmExecutionResult
      | InvalidResultError;

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

  executeSendData: (
    executionState: SendDataExecutionState,
    fallbackSender: string
  ) => AsyncGenerator<
    OnchainInteractionRequest | StaticCallRequest,
    RawStaticCallResult | OnchainInteractionResponse,
    SendDataExecutionResult
  >;
}
