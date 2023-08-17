import { DeploymentState } from "../types/deployment-state";
import { JournalMessage, JournalMessageType } from "../types/messages";

import { executionStateReducer } from "./execution-state-reducer";

const initialState: DeploymentState = {
  chainId: 0,
  executionStates: {},
};

/**
 * The root level reducer for the overall deployment state.
 *
 * @param state - the deployment state
 * @param action - a message that can be journaled
 * @returns a copy of the deployment state with the message applied
 */
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

  const previousExState = state.executionStates[action.futureId];

  return {
    ...state,
    executionStates: {
      ...state.executionStates,
      [action.futureId]: executionStateReducer(previousExState, action),
    },
  };
}
