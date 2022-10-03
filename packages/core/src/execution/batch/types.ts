import { Services } from "services/types";
import { ExecutionVertex } from "types/executionGraph";
import { VertexVisitResult } from "types/graph";

export type BatcherResult =
  | {
      _kind: "success";
      context: Map<number, any>;
    }
  | {
      _kind: "failure";
      errors: any[];
    };

export type ExecutionVertexDispatcher = (
  vertex: ExecutionVertex,
  resultAccumulator: Map<number, VertexVisitResult>,
  context: { services: Services }
) => Promise<VertexVisitResult>;

export interface ExecuteBatchResult {
  completed: Set<number>;
  onhold: Set<number>;
  errored: Set<number>;
  resultsAccumulator: Map<number, VertexVisitResult>;
}
