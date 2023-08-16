import { produce } from "immer";

import { FutureType } from "../../../types/module";
import {
  CallExecutionResult,
  ExecutionResultType,
} from "../types/execution-result";
import {
  ExecutionSateType,
  ExecutionStatus,
  StaticCallExecutionState,
} from "../types/execution-state";
import {
  JournalMessageType,
  NetworkInteractionRequestMessage,
  StaticCallCompleteMessage,
  StaticCallExecutionStateCompleteMessage,
  StaticCallExecutionStateInitializeMessage,
} from "../types/messages";

import {
  appendNetworkInteraction,
  completeStaticCall,
} from "./network-interaction-helpers";

export function staticCallExecutionStateReducer(
  state: StaticCallExecutionState,
  action:
    | StaticCallExecutionStateInitializeMessage
    | StaticCallExecutionStateCompleteMessage
    | NetworkInteractionRequestMessage
    | StaticCallCompleteMessage
): StaticCallExecutionState {
  switch (action.type) {
    case JournalMessageType.STATIC_CALL_EXECUTION_STATE_INITIALIZE:
      return initialiseStaticCallExecutionStateFrom(action);
    case JournalMessageType.STATIC_CALL_EXECUTION_STATE_COMPLETE:
      return completeStaticCallExecutionState(state, action);
    case JournalMessageType.NETWORK_INTERACTION_REQUEST:
      return appendNetworkInteraction(state, action);
    case JournalMessageType.STATIC_CALL_COMPLETE:
      return completeStaticCall(state, action);
  }
}

function initialiseStaticCallExecutionStateFrom(
  action: StaticCallExecutionStateInitializeMessage
): StaticCallExecutionState {
  const callExecutionInitialState: StaticCallExecutionState = {
    id: action.futureId,
    type: ExecutionSateType.STATIC_CALL_EXECUTION_STATE,
    futureType: FutureType.NAMED_STATIC_CALL,
    strategy: action.strategy,
    status: ExecutionStatus.STARTED,
    dependencies: new Set<string>(action.dependencies),
    artifactFutureId: action.artifactFutureId,
    contractAddress: action.contractAddress,
    functionName: action.functionName,
    args: action.args,
    from: action.from,
    networkInteractions: [],
  };

  return callExecutionInitialState;
}

function completeStaticCallExecutionState(
  state: StaticCallExecutionState,
  message: StaticCallExecutionStateCompleteMessage
): StaticCallExecutionState {
  return produce(state, (draft: StaticCallExecutionState): void => {
    draft.status = _mapStaticCallExecutionResultTypeToExecutionStatus(
      message.result
    );
    draft.result = message.result;
  });
}

function _mapStaticCallExecutionResultTypeToExecutionStatus(
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
