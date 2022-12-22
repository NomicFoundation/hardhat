import type {
  DeployState,
  DeployStateCommand,
  DeployStateExecutionCommand,
} from "types/deployment";
import { ResultsAccumulator, VertexVisitResult } from "types/graph";

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
  throw new Error(`Unexpected message type ${action}`);
}

export function viewExecutionResults(
  deployState: DeployState
): ResultsAccumulator {
  const entries: Array<[number, VertexVisitResult | null]> = Object.entries(
    deployState.execution.vertexes
  ).map(([vertexId, vertexState]) => [
    parseInt(vertexId, 10),
    vertexState.result,
  ]);

  return new Map<number, VertexVisitResult | null>(entries);
}
