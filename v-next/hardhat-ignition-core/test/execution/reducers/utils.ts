import { deploymentStateReducer } from "../../../src/internal/execution/reducers/deployment-state-reducer.js";
import type { DeploymentState } from "../../../src/internal/execution/types/deployment-state.js";
import type { JournalMessage } from "../../../src/internal/execution/types/messages.js";

export function applyMessages(messages: JournalMessage[]): DeploymentState {
  const initialState = deploymentStateReducer(undefined);

  const updatedState = messages.reduce(deploymentStateReducer, initialState);

  return updatedState;
}
