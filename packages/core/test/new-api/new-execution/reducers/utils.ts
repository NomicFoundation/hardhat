import { deploymentStateReducer } from "../../../../src/new-api/internal/new-execution/reducers/deployment-state-reducer";
import { DeploymentState } from "../../../../src/new-api/internal/new-execution/types/deployment-state";
import { JournalMessage } from "../../../../src/new-api/internal/new-execution/types/messages";

export function applyMessages(messages: JournalMessage[]): DeploymentState {
  const initialState = deploymentStateReducer(undefined);

  const updatedState = messages.reduce(deploymentStateReducer, initialState);

  return updatedState;
}
