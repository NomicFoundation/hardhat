import { DeploymentLoader } from "../deployment-loader/types";

import { deploymentStateReducer } from "./reducers/deployment-state-reducer";
import { DeploymentState } from "./types/deployment-state";
import { ExecutionResultType } from "./types/execution-result";
import { JournalMessage, JournalMessageType } from "./types/messages";

/**
 * This function applies a message to the deployment state, recording it to the
 * journal if needed.
 *
 * @param message The message to apply.
 * @param deploymentState The original deployment state.
 * @param deploymentLoader The deployment loader that will be used to record the message.
 * @returns The new deployment state.
 */
export async function applyMessage(
  message: JournalMessage,
  deploymentState: DeploymentState,
  deploymentLoader: DeploymentLoader
): Promise<DeploymentState> {
  if (shouldBeJournaled(message)) {
    // TODO: this cast as `as any` is a temporary hack because we haven't updated the
    //  type of the deployment loader yet. It must be removed soon.
    await deploymentLoader.recordToJournal(message as any);
  }

  return deploymentStateReducer(deploymentState, message);
}

/**
 * Returns true if a message should be recorded to the jorunal.
 */
export function shouldBeJournaled(message: JournalMessage): boolean {
  if (
    message.type === JournalMessageType.DEPLOYMENT_EXECUTION_STATE_COMPLETE ||
    message.type === JournalMessageType.CALL_EXECUTION_STATE_COMPLETE ||
    message.type === JournalMessageType.SEND_DATA_EXECUTION_STATE_COMPLETE
  ) {
    // We do not journal simulation errors, as we want to re-run those simulations
    // if the deployment gets resumed.
    if (
      message.result.type === ExecutionResultType.SIMULATION_ERROR ||
      message.result.type === ExecutionResultType.STRATEGY_SIMULATION_ERROR
    ) {
      return false;
    }
  }

  return true;
}
