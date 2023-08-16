import { produce } from "immer";

import { FutureType } from "../../../types/module";
import {
  CallExecutionResult,
  ExecutionResultType,
} from "../types/execution-result";
import {
  CallExecutionState,
  ExecutionSateType,
  ExecutionStatus,
} from "../types/execution-state";
import {
  CallExecutionStateCompleteMessage,
  CallExecutionStateInitializeMessage,
  JournalMessageType,
  NetworkInteractionRequestMessage,
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

export function callExecutionStateReducer(
  state: CallExecutionState,
  action:
    | CallExecutionStateInitializeMessage
    | CallExecutionStateCompleteMessage
    | NetworkInteractionRequestMessage
    | TransactionSendMessage
    | TransactionConfirmMessage
    | StaticCallCompleteMessage
): CallExecutionState {
  switch (action.type) {
    case JournalMessageType.CALL_EXECUTION_STATE_INITIALIZE:
      return initialiseCallExecutionStateFrom(action);
    case JournalMessageType.CALL_EXECUTION_STATE_COMPLETE:
      return completeCallExecutionState(state, action);
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

export function initialiseCallExecutionStateFrom(
  action: CallExecutionStateInitializeMessage
): CallExecutionState {
  const callExecutionInitialState: CallExecutionState = {
    id: action.futureId,
    type: ExecutionSateType.CALL_EXECUTION_STATE,
    futureType: FutureType.NAMED_CONTRACT_CALL,
    strategy: action.strategy,
    status: ExecutionStatus.STARTED,
    dependencies: new Set<string>(action.dependencies),
    artifactFutureId: action.artifactFutureId,
    contractAddress: action.contractAddress,
    functionName: action.functionName,
    args: action.args,
    value: action.value,
    from: action.from,
    networkInteractions: [],
  };

  return callExecutionInitialState;
}

export function completeCallExecutionState(
  state: CallExecutionState,
  message: CallExecutionStateCompleteMessage
): CallExecutionState {
  return produce(state, (draft: CallExecutionState): void => {
    draft.status = _mapCallExecutionResultTypeToExecutionStatus(message.result);
    draft.result = message.result;
  });
}

function _mapCallExecutionResultTypeToExecutionStatus(
  result: CallExecutionResult
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
