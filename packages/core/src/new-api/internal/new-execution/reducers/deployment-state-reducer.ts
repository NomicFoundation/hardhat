import { IgnitionError } from "../../../../errors";
import { assertIgnitionInvariant } from "../../utils/assertions";
import { MapExStateTypeToExState } from "../type-helpers";
import { DeploymentState, ExecutionStateMap } from "../types/deployment-state";
import { ExecutionSateType, ExecutionState } from "../types/execution-state";
import {
  JournalMessage,
  JournalMessageType,
  RunStartMessage,
} from "../types/messages";

import {
  callExecutionStateReducer,
  completeCallExecutionState,
  initialiseCallExecutionStateFrom,
} from "./call-execution-state-reducer";
import { initialiseContractAtExecutionStateFrom } from "./contract-at-execution-state-reducer";
import {
  completeDeploymentExecutionState,
  deploymentExecutionStateReducer,
  initialiseDeploymentExecutionStateFrom,
} from "./deployment-execution-state-reducer";
import { initialiseReadEventArgumentExecutionStateFrom } from "./read-event-argument-execution-state-reducer";
import {
  completeSendDataExecutionState,
  initialiseSendDataExecutionStateFrom,
  sendDataExecutionStateReducer,
} from "./send-data-execution-state-reducer";
import {
  completeStaticCallExecutionState,
  initialiseStaticCallExecutionStateFrom,
  staticCallExecutionStateReducer,
} from "./static-call-execution-state-reducer";

const initialState: DeploymentState = {
  chainId: 0,
  executionStates: {},
};

export function deploymentStateReducer(
  state: DeploymentState = initialState,
  action?: JournalMessage
): DeploymentState {
  if (action === undefined) {
    return state;
  }

  if (action.type === JournalMessageType.RUN_START) {
    return {
      ...state,
      chainId: action.chainId,
    };
  }

  return {
    ...state,
    executionStates: executionStatesReducer(state.executionStates, action),
  };
}

function executionStatesReducer(
  state: ExecutionStateMap = {},
  action: Exclude<JournalMessage, RunStartMessage>
): ExecutionStateMap {
  const previousExState = state[action.futureId];

  return {
    ...state,
    [action.futureId]: executionStateReducer(previousExState, action),
  };
}

function executionStateReducer(
  state: ExecutionState | undefined,
  action: Exclude<JournalMessage, RunStartMessage>
): ExecutionState {
  switch (action.type) {
    case JournalMessageType.DEPLOYMENT_EXECUTION_STATE_INITIALIZE:
      return initialiseDeploymentExecutionStateFrom(action);
    case JournalMessageType.CALL_EXECUTION_STATE_INITIALIZE:
      return initialiseCallExecutionStateFrom(action);
    case JournalMessageType.STATIC_CALL_EXECUTION_STATE_INITIALIZE:
      return initialiseStaticCallExecutionStateFrom(action);
    case JournalMessageType.SEND_DATA_EXECUTION_STATE_INITIALIZE:
      return initialiseSendDataExecutionStateFrom(action);
    case JournalMessageType.CONTRACT_AT_EXECUTION_STATE_INITIALIZE:
      return initialiseContractAtExecutionStateFrom(action);
    case JournalMessageType.READ_EVENT_ARGUMENT_EXECUTION_STATE_INITIALIZE:
      return initialiseReadEventArgumentExecutionStateFrom(action);
    case JournalMessageType.DEPLOYMENT_EXECUTION_STATE_COMPLETE:
      return _ensureExStateThen(
        ExecutionSateType.DEPLOYMENT_EXECUTION_STATE,
        state,
        action,
        completeDeploymentExecutionState
      );
    case JournalMessageType.CALL_EXECUTION_STATE_COMPLETE:
      return _ensureExStateThen(
        ExecutionSateType.CALL_EXECUTION_STATE,
        state,
        action,
        completeCallExecutionState
      );
    case JournalMessageType.STATIC_CALL_EXECUTION_STATE_COMPLETE:
      return _ensureExStateThen(
        ExecutionSateType.STATIC_CALL_EXECUTION_STATE,
        state,
        action,
        completeStaticCallExecutionState
      );
    case JournalMessageType.SEND_DATA_EXECUTION_STATE_COMPLETE:
      return _ensureExStateThen(
        ExecutionSateType.SEND_DATA_EXECUTION_STATE,
        state,
        action,
        completeSendDataExecutionState
      );
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

function _ensureExStateThen<
  ExStateT extends ExecutionSateType,
  Message extends JournalMessage
>(
  exStateType: ExStateT,
  state: ExecutionState | undefined,
  action: Message,
  reducer: (
    state: MapExStateTypeToExState<ExStateT>,
    action: Message
  ) => MapExStateTypeToExState<ExStateT>
): MapExStateTypeToExState<ExStateT> {
  assertIgnitionInvariant(
    state !== undefined,
    `Exeuction state must be defined`
  );

  assertIgnitionInvariant(
    state.type === exStateType,
    `Expected execution state for ${state.id} to be a ${exStateType}, but instead it was ${state.type}`
  );

  return reducer(
    state as MapExStateTypeToExState<ExStateT>,
    action
  ) as MapExStateTypeToExState<ExStateT>;
}
