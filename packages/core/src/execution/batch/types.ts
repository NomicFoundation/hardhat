import { ExecutionContext } from "types/deployment";
import { ExecutionVertex } from "types/executionGraph";
import { ResultsAccumulator, VertexVisitResult } from "types/graph";

export type BatcherResult =
  | {
      _kind: "success";
      context: Map<number, VertexVisitResult>;
    }
  | {
      _kind: "failure";
      errors: any[];
    };

export type ExecutionVertexDispatcher = (
  vertex: ExecutionVertex,
  resultAccumulator: ResultsAccumulator,
  context: ExecutionContext
) => Promise<VertexVisitResult>;

export interface ExecuteBatchResult {
  completed: Set<number>;
  onhold: Set<number>;
  errored: Set<number>;
  resultsAccumulator: Map<number, VertexVisitResult>;
}
