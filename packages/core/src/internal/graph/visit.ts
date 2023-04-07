import { IgnitionError } from "../../errors";
import {
  IGraph,
  ResultsAccumulator,
  VertexResultEnum,
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
  ) => Promise<VertexVisitResult<TResult>>
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

    if (vertexVisitResult._kind === VertexResultEnum.FAILURE) {
      return {
        _kind: VisitResultState.FAILURE,
        failures: [`${phase} failed`, [vertexVisitResult.failure]],
      };
    }

    if (vertexVisitResult._kind === VertexResultEnum.HOLD) {
      return {
        _kind: VisitResultState.HOLD,
        holds: [vertex as any],
      };
    }

    resultAccumulator.set(vertexId, vertexVisitResult);
  }

  return { _kind: VisitResultState.SUCCESS, result: resultAccumulator };
}
