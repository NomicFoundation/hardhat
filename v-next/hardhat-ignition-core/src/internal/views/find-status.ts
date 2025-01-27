import type { ExecutionErrorDeploymentResult } from "../../types/deploy.js";
import type { DeploymentState } from "../execution/types/deployment-state.js";
import type {
  CallExecutionState,
  DeploymentExecutionState,
  ExecutionState,
  SendDataExecutionState,
  StaticCallExecutionState,
} from "../execution/types/execution-state.js";

import { ExecutionResultType } from "../execution/types/execution-result.js";
import {
  ExecutionSateType,
  ExecutionStatus,
} from "../execution/types/execution-state.js";
import { formatExecutionError } from "../formatters.js";
import { assertIgnitionInvariant } from "../utils/assertions.js";

export function findStatus(
  deploymentState: DeploymentState,
): Omit<ExecutionErrorDeploymentResult, "type"> {
  const executionStates = Object.values(deploymentState.executionStates);

  return {
    started: executionStates
      .filter((ex) => ex.status === ExecutionStatus.STARTED)
      .map((ex) => ex.id),
    successful: executionStates
      .filter((ex) => ex.status === ExecutionStatus.SUCCESS)
      .map((ex) => ex.id),
    held: executionStates
      .filter(canFail)
      .filter((ex) => ex.status === ExecutionStatus.HELD)
      .map((ex) => {
        assertIgnitionInvariant(
          ex.result !== undefined,
          `Execution state ${ex.id} is marked as held but has no result`,
        );

        assertIgnitionInvariant(
          ex.result.type === ExecutionResultType.STRATEGY_HELD,
          `Execution state ${ex.id} is marked as held but has ${ex.result.type} instead of a held result`,
        );

        return {
          futureId: ex.id,
          heldId: ex.result.heldId,
          reason: ex.result.reason,
        };
      }),
    timedOut: executionStates
      .filter(canTimeout)
      .filter((ex) => ex.status === ExecutionStatus.TIMEOUT)
      .map((ex) => ({
        futureId: ex.id,
        networkInteractionId: ex.networkInteractions.at(-1)!.id,
      })),
    failed: executionStates
      .filter(canFail)
      .filter((ex) => ex.status === ExecutionStatus.FAILED)
      .map((ex) => {
        assertIgnitionInvariant(
          ex.result !== undefined &&
            ex.result.type !== ExecutionResultType.SUCCESS &&
            ex.result.type !== ExecutionResultType.STRATEGY_HELD,
          `Execution state ${ex.id} is marked as failed but has no error result`,
        );

        return {
          futureId: ex.id,
          networkInteractionId: ex.networkInteractions.at(-1)!.id,
          error: formatExecutionError(ex.result),
        };
      }),
  };
}

// TODO: Does this exist anywhere else? It's in fact just checking if it sends txs
function canTimeout(
  exState: ExecutionState,
): exState is
  | DeploymentExecutionState
  | CallExecutionState
  | SendDataExecutionState {
  return (
    exState.type === ExecutionSateType.DEPLOYMENT_EXECUTION_STATE ||
    exState.type === ExecutionSateType.CALL_EXECUTION_STATE ||
    exState.type === ExecutionSateType.SEND_DATA_EXECUTION_STATE
  );
}

// TODO: Does this exist anywhere else? It's in fact just checking if has network interactions
function canFail(
  exState: ExecutionState,
): exState is
  | DeploymentExecutionState
  | CallExecutionState
  | SendDataExecutionState
  | StaticCallExecutionState {
  return (
    exState.type === ExecutionSateType.DEPLOYMENT_EXECUTION_STATE ||
    exState.type === ExecutionSateType.CALL_EXECUTION_STATE ||
    exState.type === ExecutionSateType.SEND_DATA_EXECUTION_STATE ||
    exState.type === ExecutionSateType.STATIC_CALL_EXECUTION_STATE
  );
}
