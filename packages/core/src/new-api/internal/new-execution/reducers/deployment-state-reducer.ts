import { IgnitionError } from "../../../../errors";
import { DeploymentState } from "../types/deployment-state";
import { JournalMessage, JournalMessageType } from "../types/messages";

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

  switch (action.type) {
    case JournalMessageType.RUN_START:
      return {
        ...state,
        chainId: action.chainId,
      };
    default:
      return assertUnknownAction(action.type);
  }
}

function assertUnknownAction(actionType: never): DeploymentState {
  throw new IgnitionError(
    "Unknown message as action" + JSON.stringify(actionType)
  );
}
