import type {
  CallExecutionResult,
  DeploymentExecutionResult,
  SendDataExecutionResult,
  StaticCallExecutionResult,
} from "../../types/execution-result";
import type {
  CallExecutionState,
  DeploymentExecutionState,
  SendDataExecutionState,
  StaticCallExecutionState,
} from "../../types/execution-state";
import type {
  CallExecutionStateCompleteMessage,
  DeploymentExecutionStateCompleteMessage,
  SendDataExecutionStateCompleteMessage,
  StaticCallExecutionStateCompleteMessage,
} from "../../types/messages";

import { produce } from "immer";

import { ExecutionResultType } from "../../types/execution-result";
import { ExecutionStatus } from "../../types/execution-state";

/**
 * Update the execution state for a future to complete.
 *
 * This can be done generically currently because all execution states
 * excluding contractAt and readEventArg have a result property, and
 * contractAt and readEventArg are initialized completed.
 *
 * @param state - the execution state that will be completed
 * @param message - the execution state specific completion message
 * @returns - a copy of the execution state with the result and status updated
 */
export function completeExecutionState<
  ExState extends
    | StaticCallExecutionState
    | SendDataExecutionState
    | CallExecutionState
    | DeploymentExecutionState,
>(
  state: ExState,
  message:
    | StaticCallExecutionStateCompleteMessage
    | SendDataExecutionStateCompleteMessage
    | CallExecutionStateCompleteMessage
    | DeploymentExecutionStateCompleteMessage,
): ExState {
  return produce(state, (draft: ExState): void => {
    draft.status = _mapResultTypeToStatus(message.result);
    draft.result = message.result;
  });
}

function _mapResultTypeToStatus(
  result:
    | StaticCallExecutionResult
    | SendDataExecutionResult
    | CallExecutionResult
    | DeploymentExecutionResult,
) {
  switch (result.type) {
    case ExecutionResultType.SUCCESS:
      return ExecutionStatus.SUCCESS;
    case ExecutionResultType.SIMULATION_ERROR:
      return ExecutionStatus.FAILED;
    case ExecutionResultType.STRATEGY_SIMULATION_ERROR:
      return ExecutionStatus.FAILED;
    case ExecutionResultType.REVERTED_TRANSACTION:
      return ExecutionStatus.FAILED;
    case ExecutionResultType.STATIC_CALL_ERROR:
      return ExecutionStatus.FAILED;
    case ExecutionResultType.STRATEGY_ERROR:
      return ExecutionStatus.FAILED;
    case ExecutionResultType.STRATEGY_HELD:
      return ExecutionStatus.HELD;
  }
}
