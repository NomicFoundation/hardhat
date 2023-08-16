import { IgnitionError } from "../../../../errors";
import { assertIgnitionInvariant } from "../../utils/assertions";
import { DeploymentState, ExecutionStateMap } from "../types/deployment-state";
import { ExecutionSateType, ExecutionState } from "../types/execution-state";
import {
  JournalMessage,
  JournalMessageType,
  RunStartMessage,
} from "../types/messages";

import { callExecutionStateReducer } from "./call-execution-state-reducer";
import { contractAtExecutionStateReducer } from "./contract-at-execution-state-reducer";
import { deploymentExecutionStateReducer } from "./deployment-execution-state-reducer";
import { readEventArgumentExecutionStateReducer } from "./read-event-argument-execution-state-reducer";
import { sendDataExecutionStateReducer } from "./send-data-execution-state-reducer";
import { staticCallExecutionStateReducer } from "./static-call-execution-state-reducer";

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
    case JournalMessageType.CALL_EXECUTION_STATE_INITIALIZE:
    case JournalMessageType.STATIC_CALL_EXECUTION_STATE_INITIALIZE:
    case JournalMessageType.SEND_DATA_EXECUTION_STATE_INITIALIZE:
    case JournalMessageType.CONTRACT_AT_EXECUTION_STATE_INITIALIZE:
    case JournalMessageType.READ_EVENT_ARGUMENT_EXECUTION_STATE_INITIALIZE:
    case JournalMessageType.NETWORK_INTERACTION_REQUEST:
    case JournalMessageType.TRANSACTION_SEND:
    case JournalMessageType.TRANSACTION_CONFIRM:
    case JournalMessageType.DEPLOYMENT_EXECUTION_STATE_COMPLETE:
    case JournalMessageType.CALL_EXECUTION_STATE_COMPLETE:
    case JournalMessageType.STATIC_CALL_EXECUTION_STATE_COMPLETE:
    case JournalMessageType.STATIC_CALL_COMPLETE:
    case JournalMessageType.SEND_DATA_EXECUTION_STATE_COMPLETE:
      return {
        ...state,
        executionStates: executionStatesReducer(state.executionStates, action),
      };
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
    case JournalMessageType.CALL_EXECUTION_STATE_INITIALIZE:
      return callExecutionStateReducer(null as any, action);
    case JournalMessageType.STATIC_CALL_EXECUTION_STATE_INITIALIZE:
      return staticCallExecutionStateReducer(null as any, action);
    case JournalMessageType.SEND_DATA_EXECUTION_STATE_INITIALIZE:
      return sendDataExecutionStateReducer(null as any, action);
    case JournalMessageType.CONTRACT_AT_EXECUTION_STATE_INITIALIZE:
      return contractAtExecutionStateReducer(null as any, action);
    case JournalMessageType.READ_EVENT_ARGUMENT_EXECUTION_STATE_INITIALIZE:
      return readEventArgumentExecutionStateReducer(null as any, action);
    case JournalMessageType.DEPLOYMENT_EXECUTION_STATE_COMPLETE:
      assertIgnitionInvariant(
        state !== undefined &&
          state.type === ExecutionSateType.DEPLOYMENT_EXECUTION_STATE,
        `To complete the execution state must be deployment but is ${
          state === undefined ? "undefined" : state.type
        }`
      );

      return deploymentExecutionStateReducer(state, action);
    case JournalMessageType.CALL_EXECUTION_STATE_COMPLETE:
      assertIgnitionInvariant(
        state !== undefined &&
          state.type === ExecutionSateType.CALL_EXECUTION_STATE,
        `To complete the execution state must be call but is ${
          state === undefined ? "undefined" : state.type
        }`
      );

      return callExecutionStateReducer(state, action);
    case JournalMessageType.STATIC_CALL_EXECUTION_STATE_COMPLETE:
      assertIgnitionInvariant(
        state !== undefined &&
          state.type === ExecutionSateType.STATIC_CALL_EXECUTION_STATE,
        `To complete the execution state must be a static call but is ${
          state === undefined ? "undefined" : state.type
        }`
      );

      return staticCallExecutionStateReducer(state, action);
    case JournalMessageType.SEND_DATA_EXECUTION_STATE_COMPLETE:
      assertIgnitionInvariant(
        state !== undefined &&
          state.type === ExecutionSateType.SEND_DATA_EXECUTION_STATE,
        `To complete the execution state must be a send data but is ${
          state === undefined ? "undefined" : state.type
        }`
      );

      return sendDataExecutionStateReducer(state, action);
    case JournalMessageType.NETWORK_INTERACTION_REQUEST:
    case JournalMessageType.STATIC_CALL_COMPLETE:
      assertIgnitionInvariant(
        state !== undefined,
        "Cannot network interact before initialising"
      );

      switch (state.type) {
        case ExecutionSateType.DEPLOYMENT_EXECUTION_STATE:
          return deploymentExecutionStateReducer(state, action);
        case ExecutionSateType.CALL_EXECUTION_STATE:
          return callExecutionStateReducer(state, action);
        case ExecutionSateType.STATIC_CALL_EXECUTION_STATE:
          return staticCallExecutionStateReducer(state, action);
        case ExecutionSateType.SEND_DATA_EXECUTION_STATE:
          return sendDataExecutionStateReducer(state, action);
        case ExecutionSateType.CONTRACT_AT_EXECUTION_STATE:
        case ExecutionSateType.READ_EVENT_ARGUMENT_EXECUTION_STATE:
          throw new IgnitionError(
            `Unexpected network-level message ${action.type} for execution state ${state.type} (futureId: ${state.id})`
          );
      }
    case JournalMessageType.TRANSACTION_SEND:
    case JournalMessageType.TRANSACTION_CONFIRM:
      assertIgnitionInvariant(
        state !== undefined,
        "Cannot network interact before initialising"
      );

      switch (state.type) {
        case ExecutionSateType.DEPLOYMENT_EXECUTION_STATE:
          return deploymentExecutionStateReducer(state, action);
        case ExecutionSateType.CALL_EXECUTION_STATE:
          return callExecutionStateReducer(state, action);
        case ExecutionSateType.SEND_DATA_EXECUTION_STATE:
          return sendDataExecutionStateReducer(state, action);
        case ExecutionSateType.STATIC_CALL_EXECUTION_STATE:
        case ExecutionSateType.CONTRACT_AT_EXECUTION_STATE:
        case ExecutionSateType.READ_EVENT_ARGUMENT_EXECUTION_STATE:
          throw new IgnitionError(
            `Unexpected network-level message ${action.type} for execution state ${state.type} (futureId: ${state.id})`
          );
      }
  }
}
