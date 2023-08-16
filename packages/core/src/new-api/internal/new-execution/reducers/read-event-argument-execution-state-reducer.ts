import { FutureType } from "../../../types/module";
import {
  ExecutionSateType,
  ExecutionStatus,
  ReadEventArgumentExecutionState,
} from "../types/execution-state";
import { ReadEventArgExecutionStateInitializeMessage } from "../types/messages";

export function initialiseReadEventArgumentExecutionStateFrom(
  action: ReadEventArgExecutionStateInitializeMessage
): ReadEventArgumentExecutionState {
  const readEventArgumentExecutionInitialState: ReadEventArgumentExecutionState =
    {
      id: action.futureId,
      type: ExecutionSateType.READ_EVENT_ARGUMENT_EXECUTION_STATE,
      futureType: FutureType.READ_EVENT_ARGUMENT,
      strategy: action.strategy,
      status: ExecutionStatus.SUCCESS,
      dependencies: new Set<string>(action.dependencies),
      artifactFutureId: action.artifactFutureId,
      eventName: action.eventName,
      argumentName: action.argumentName,
      txToReadFrom: action.txToReadFrom,
      emitterAddress: action.emitterAddress,
      eventIndex: action.eventIndex,
      result: action.result,
    };

  return readEventArgumentExecutionInitialState;
}
