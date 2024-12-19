import { DeploymentLoader } from "../deployment-loader/types";

import { deploymentStateReducer } from "./reducers/deployment-state-reducer";
import { DeploymentState } from "./types/deployment-state";
import { ExecutionResultType } from "./types/execution-result";
import {
  DeploymentInitializeMessage,
  JournalMessage,
  JournalMessageType,
} from "./types/messages";

/**
 * Loads a previous deployment state from its existing messages.
 * @param messages An async iterator of journal messages.
 * @returns The deployment state or undefined if no messages were provided.
 */
export async function loadDeploymentState(
  deploymentLoader: DeploymentLoader
): Promise<DeploymentState | undefined> {
  let deploymentState: DeploymentState | undefined;

  for await (const message of deploymentLoader.readFromJournal()) {
    deploymentState = deploymentStateReducer(deploymentState, message);
  }

  return deploymentState;
}

/**
 * Ininitalizes the deployment state and records the run start message to the journal.
 *
 * @param chainId The chain ID.
 * @param deploymentLoader The deployment loader that will be used to record the message.
 * @returns The new DeploymentState.
 */
export async function initializeDeploymentState(
  chainId: number,
  deploymentLoader: DeploymentLoader
): Promise<DeploymentState> {
  const message: DeploymentInitializeMessage = {
    type: JournalMessageType.DEPLOYMENT_INITIALIZE,
    chainId,
  };

  await deploymentLoader.recordToJournal(message);

  return deploymentStateReducer(undefined, message);
}

/**
 * This function applies a new message to the deployment state, recording it to the
 * journal if needed.
 *
 * @param message The message to apply.
 * @param deploymentState The original deployment state.
 * @param deploymentLoader The deployment loader that will be used to record the message.
 * @returns The new deployment state.
 */
export async function applyNewMessage(
  message: JournalMessage,
  deploymentState: DeploymentState,
  deploymentLoader: DeploymentLoader
): Promise<DeploymentState> {
  if (shouldBeJournaled(message)) {
    await deploymentLoader.recordToJournal(message);
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
