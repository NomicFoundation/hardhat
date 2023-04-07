import type { ExecutionContext } from "./deployment";
import type {
  ExecutionResultsAccumulator,
  ExecutionVertex,
  ExecutionVertexVisitResult,
} from "./executionGraph";

export type ExecutionVertexDispatcher = (
  vertex: ExecutionVertex,
  resultAccumulator: ExecutionResultsAccumulator,
  context: ExecutionContext
) => Promise<ExecutionVertexVisitResult>;
