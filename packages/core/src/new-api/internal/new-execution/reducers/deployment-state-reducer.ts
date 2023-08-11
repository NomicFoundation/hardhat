import { IgnitionError } from "../../../../errors";
import { assertIgnitionInvariant } from "../../utils/assertions";
import { DeploymentState, ExecutionStateMap } from "../types/deployment-state";
import { ExecutionSateType, ExecutionState } from "../types/execution-state";
import {
  JournalMessage,
  JournalMessageType,
  RunStartMessage,
} from "../types/messages";
import { deploymentExecutionStateReducer } from "./deployment-execution-state-reducer";
import { assertUnknownAction } from "./utils";

const initialState: DeploymentState = {
  chainId: 0,
  executionStates: {},
};

export function deploymentStateReducer(
  state: DeploymentState = initialState,
  action?: JournalMessage
): DeploymentState {
  if (action === undefined) {
    return {
      chainId: 0,
      executionStates: {},
    };
  }

  switch (action.type) {
    case JournalMessageType.RUN_START:
      return {
        ...state,
        chainId: action.chainId,
      };
    case JournalMessageType.DEPLOYMENT_EXECUTION_STATE_INITIALIZE:
    case JournalMessageType.NETWORK_INTERACTION_REQUEST:
    case JournalMessageType.TRANSACTION_SEND:
      return {
        ...state,
        executionStates: executionStatesReducer(state.executionStates, action),
      };
    default:
      return assertUnknownAction(action);
  }
}

function executionStatesReducer(
  state: ExecutionStateMap = {},
  action: Exclude<JournalMessage, RunStartMessage>
): ExecutionStateMap {
  const previousExState = state[action.futureId];

  return {
    ...state,
    [action.futureId]: dispatchToPerExecutionStateReducer(
      previousExState,
      action
    ),
  };
}

function dispatchToPerExecutionStateReducer(
  state: ExecutionState | undefined,
  action: Exclude<JournalMessage, RunStartMessage>
): ExecutionState {
  switch (action.type) {
    case JournalMessageType.DEPLOYMENT_EXECUTION_STATE_INITIALIZE:
      return deploymentExecutionStateReducer(null as any, action);
    case JournalMessageType.NETWORK_INTERACTION_REQUEST:
    case JournalMessageType.TRANSACTION_SEND:
      assertIgnitionInvariant(
        state !== undefined,
        "Cannot network interact before initialising"
      );

      switch (state.type) {
        case ExecutionSateType.DEPLOYMENT_EXECUTION_STATE:
          return deploymentExecutionStateReducer(state, action);
        case ExecutionSateType.CALL_EXECUTION_STATE:
        case ExecutionSateType.CONTRACT_AT_EXECUTION_STATE:
        case ExecutionSateType.READ_EVENT_ARGUMENT_EXECUTION_STATE:
        case ExecutionSateType.SEND_DATA_EXECUTION_STATE:
        case ExecutionSateType.STATIC_CALL_EXECUTION_STATE:
          throw new IgnitionError("Not implemented");
        default:
          return assertUnknownAction(state);
      }
    default:
      return assertUnknownAction(action);
  }
}
