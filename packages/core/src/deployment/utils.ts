import type {
  DeployState,
  DeployStateCommand,
  DeployStateExecutionCommand,
} from "types/deployment";
import type {
  ExecutionResultsAccumulator,
  ExecutionVertexVisitResult,
} from "types/executionGraph";
import { IgnitionError } from "utils/errors";

export function isDeployStateExecutionCommand(
  command: DeployStateCommand
): command is DeployStateExecutionCommand {
  return [
    "EXECUTION::START",
    "EXECUTION::SET_BATCH",
    "EXECUTION::SET_VERTEX_RESULT",
  ].includes(command.type);
}

export function assertNeverMessageType(action: never) {
  throw new IgnitionError(`Unexpected message type ${action}`);
}

export function viewExecutionResults(
  deployState: DeployState
): ExecutionResultsAccumulator {
  const entries: Array<[number, ExecutionVertexVisitResult | null]> =
    Object.entries(deployState.execution.vertexes).map(
      ([vertexId, vertexState]) => [parseInt(vertexId, 10), vertexState.result]
    );

  return new Map<number, ExecutionVertexVisitResult | null>(entries);
}
