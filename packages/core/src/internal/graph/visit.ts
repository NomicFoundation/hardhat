import { IgnitionError } from "../../errors";
import {
  IGraph,
  ResultsAccumulator,
  VertexVisitResult,
  VisitResult,
  VisitResultState,
} from "../types/graph";

export async function visit<T, C, TResult>(
  phase: "Execution" | "Validation",
  orderedVertexIds: number[],
  graph: IGraph<T>,
  context: C,
  resultAccumulator: ResultsAccumulator<TResult>,
  vistitorAction: (
    vertex: T,
    resultAccumulator: ResultsAccumulator<TResult>,
    context: C
  ) => Promise<VertexVisitResult<TResult>>,
  afterAction?: (vertex: T, kind: "success" | "failure", err?: unknown) => void
): Promise<VisitResult<TResult>> {
  for (const vertexId of orderedVertexIds) {
    const vertex = graph.vertexes.get(vertexId);

    if (vertex === undefined) {
      throw new IgnitionError(`Could not get vertex ${vertexId}`);
    }

    const vertexVisitResult = await vistitorAction(
      vertex,
      resultAccumulator,
      context
    );

    if (vertexVisitResult._kind === "failure") {
      if (afterAction !== undefined) {
        afterAction(vertex, "failure", vertexVisitResult.failure);
      }

      return {
        _kind: VisitResultState.FAILURE,
        failures: [`${phase} failed`, [vertexVisitResult.failure]],
      };
    }

    if (vertexVisitResult._kind === "hold") {
      return {
        _kind: VisitResultState.HOLD,
        holds: [vertex as any],
      };
    }

    resultAccumulator.set(vertexId, vertexVisitResult);

    if (afterAction !== undefined) {
      afterAction(vertex, "success");
    }
  }

  return { _kind: VisitResultState.SUCCESS, result: resultAccumulator };
}
