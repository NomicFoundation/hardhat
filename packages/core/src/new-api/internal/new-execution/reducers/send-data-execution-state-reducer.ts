import { produce } from "immer";

import { FutureType } from "../../../types/module";
import {
  ExecutionResultType,
  SendDataExecutionResult,
} from "../types/execution-result";
import {
  ExecutionSateType,
  ExecutionStatus,
  SendDataExecutionState,
} from "../types/execution-state";
import {
  JournalMessageType,
  NetworkInteractionRequestMessage,
  SendDataExecutionStateCompleteMessage,
  SendDataExecutionStateInitializeMessage,
  StaticCallCompleteMessage,
  TransactionConfirmMessage,
  TransactionSendMessage,
} from "../types/messages";

import {
  appendNetworkInteraction,
  appendTransactionToOnchainInteraction,
  completeStaticCall,
  confirmTransaction,
} from "./network-interaction-helpers";

export function sendDataExecutionStateReducer(
  state: SendDataExecutionState,
  action:
    | SendDataExecutionStateInitializeMessage
    | SendDataExecutionStateCompleteMessage
    | NetworkInteractionRequestMessage
    | TransactionSendMessage
    | TransactionConfirmMessage
    | StaticCallCompleteMessage
): SendDataExecutionState {
  switch (action.type) {
    case JournalMessageType.SEND_DATA_EXECUTION_STATE_INITIALIZE:
      return initialiseSendDataExecutionStateFrom(action);
    case JournalMessageType.SEND_DATA_EXECUTION_STATE_COMPLETE:
      return completeSendDataExecutionState(state, action);
    case JournalMessageType.NETWORK_INTERACTION_REQUEST:
      return appendNetworkInteraction(state, action);
    case JournalMessageType.TRANSACTION_SEND:
      return appendTransactionToOnchainInteraction(state, action);
    case JournalMessageType.TRANSACTION_CONFIRM:
      return confirmTransaction(state, action);
    case JournalMessageType.STATIC_CALL_COMPLETE:
      return completeStaticCall(state, action);
  }
}

export function initialiseSendDataExecutionStateFrom(
  action: SendDataExecutionStateInitializeMessage
): SendDataExecutionState {
  const callExecutionInitialState: SendDataExecutionState = {
    id: action.futureId,
    type: ExecutionSateType.SEND_DATA_EXECUTION_STATE,
    futureType: FutureType.SEND_DATA,
    strategy: action.strategy,
    status: ExecutionStatus.STARTED,
    dependencies: new Set<string>(action.dependencies),
    to: action.to,
    data: action.data,
    value: action.value,
    from: action.from,
    networkInteractions: [],
  };

  return callExecutionInitialState;
}

export function completeSendDataExecutionState(
  state: SendDataExecutionState,
  message: SendDataExecutionStateCompleteMessage
): SendDataExecutionState {
  return produce(state, (draft: SendDataExecutionState): void => {
    draft.status = _mapSendDataExecutionResultTypeToExecutionStatus(
      message.result
    );
    draft.result = message.result;
  });
}

function _mapSendDataExecutionResultTypeToExecutionStatus(
  result: SendDataExecutionResult
) {
  switch (result.type) {
    case ExecutionResultType.SUCCESS:
      return ExecutionStatus.SUCCESS;
    case ExecutionResultType.SIMULATION_ERROR:
      return ExecutionStatus.FAILED;
    case ExecutionResultType.REVERTED_TRANSACTION:
      return ExecutionStatus.FAILED;
    case ExecutionResultType.STATIC_CALL_ERROR:
      return ExecutionStatus.FAILED;
    case ExecutionResultType.STRATEGY_ERROR:
      return ExecutionStatus.FAILED;
  }
}
