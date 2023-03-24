import type { ExecutionContext } from "./deployment";
import type {
  ExecutionResultsAccumulator,
  ExecutionVertex,
  ExecutionVertexVisitResult,
} from "./executionGraph";

export type BatcherResult =
  | {
      _kind: "success";
      context: Map<number, ExecutionVertexVisitResult>;
    }
  | {
      _kind: "failure";
      errors: any[];
    };

export type ExecutionVertexDispatcher = (
  vertex: ExecutionVertex,
  resultAccumulator: ExecutionResultsAccumulator,
  context: ExecutionContext
) => Promise<ExecutionVertexVisitResult>;
