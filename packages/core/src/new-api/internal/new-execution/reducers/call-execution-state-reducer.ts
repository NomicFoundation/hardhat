import { FutureType } from "../../../types/module";
import {
  CallExecutionState,
  ExecutionSateType,
  ExecutionStatus,
} from "../types/execution-state";
import {
  CallExecutionStateInitializeMessage,
  JournalMessageType,
} from "../types/messages";

export function callExecutionStateReducer(
  _state: CallExecutionState,
  action: CallExecutionStateInitializeMessage
): CallExecutionState {
  switch (action.type) {
    case JournalMessageType.CALL_EXECUTION_STATE_INITIALIZE:
      return initialiseCallExecutionStateFrom(action);
  }
}

function initialiseCallExecutionStateFrom(
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
