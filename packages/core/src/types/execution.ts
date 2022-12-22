import { ExecutionContext } from "./deployment";
import { ExecutionVertex } from "./executionGraph";
import { ResultsAccumulator, VertexVisitResult } from "./graph";

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
