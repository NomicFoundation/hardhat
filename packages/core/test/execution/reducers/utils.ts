import { deploymentStateReducer } from "../../../src/internal/execution/reducers/deployment-state-reducer";
import { DeploymentState } from "../../../src/internal/execution/types/deployment-state";
import { JournalMessage } from "../../../src/internal/execution/types/messages";

export function applyMessages(messages: JournalMessage[]): DeploymentState {
  const initialState = deploymentStateReducer(undefined);

  const updatedState = messages.reduce(deploymentStateReducer, initialState);

  return updatedState;
}
