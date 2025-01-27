import type {
  DeploymentExecutionResult,
  CallExecutionResult,
  SendDataExecutionResult,
  StaticCallExecutionResult,
} from "../../types/execution-result";
import type {
  DeploymentExecutionState,
  CallExecutionState,
  SendDataExecutionState,
  StaticCallExecutionState,
} from "../../types/execution-state";
import type {
  DeploymentExecutionStateCompleteMessage,
  CallExecutionStateCompleteMessage,
  SendDataExecutionStateCompleteMessage,
  StaticCallExecutionStateCompleteMessage,
} from "../../types/messages";

import { ExecutionSateType } from "../../types/execution-state";
import { JournalMessageType } from "../../types/messages";

/**
 * Creates a message indicating that an execution state is now complete.
 *
 * IMPORTANT NOTE: This function is NOT type-safe. It's the caller's responsibility
 * to ensure that the result is of the correct type.
 *
 * @param exState The completed execution state.
 * @param result The result of the execution.
 * @returns The completion message.
 */
export function createExecutionStateCompleteMessage(
  exState:
    | DeploymentExecutionState
    | CallExecutionState
    | SendDataExecutionState
    | StaticCallExecutionState,
  result:
    | DeploymentExecutionResult
    | CallExecutionResult
    | SendDataExecutionResult
    | StaticCallExecutionResult,
):
  | DeploymentExecutionStateCompleteMessage
  | CallExecutionStateCompleteMessage
  | SendDataExecutionStateCompleteMessage
  | StaticCallExecutionStateCompleteMessage {
  if (exState.type === ExecutionSateType.STATIC_CALL_EXECUTION_STATE) {
    return {
      type: JournalMessageType.STATIC_CALL_EXECUTION_STATE_COMPLETE,
      futureId: exState.id,
      result: result as StaticCallExecutionResult,
    };
  }

  return createExecutionStateCompleteMessageForExecutionsWithOnchainInteractions(
    exState,
    result,
  );
}

/**
 * Creates a message indicating that an execution state is now complete for
 * execution states that require onchain interactions.
 *
 * IMPORTANT NOTE: This function is NOT type-safe. It's the caller's responsibility
 * to ensure that the result is of the correct type.
 *
 * @param exState The completed execution state.
 * @param result The result of the execution.
 * @returns The completion message.
 */
export function createExecutionStateCompleteMessageForExecutionsWithOnchainInteractions(
  exState:
    | DeploymentExecutionState
    | CallExecutionState
    | SendDataExecutionState,
  result:
    | DeploymentExecutionResult
    | CallExecutionResult
    | SendDataExecutionResult,
):
  | DeploymentExecutionStateCompleteMessage
  | CallExecutionStateCompleteMessage
  | SendDataExecutionStateCompleteMessage {
  switch (exState.type) {
    case ExecutionSateType.DEPLOYMENT_EXECUTION_STATE:
      return {
        type: JournalMessageType.DEPLOYMENT_EXECUTION_STATE_COMPLETE,
        futureId: exState.id,
        result: result as DeploymentExecutionResult,
      };

    case ExecutionSateType.CALL_EXECUTION_STATE:
      return {
        type: JournalMessageType.CALL_EXECUTION_STATE_COMPLETE,
        futureId: exState.id,
        result: result as CallExecutionResult,
      };

    case ExecutionSateType.SEND_DATA_EXECUTION_STATE:
      return {
        type: JournalMessageType.SEND_DATA_EXECUTION_STATE_COMPLETE,
        futureId: exState.id,
        result: result as SendDataExecutionResult,
      };
  }
}
