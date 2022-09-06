import { IGraph, VertexVisitResult, VisitResult } from "../types/graph";

export async function visit<T, C>(
  phase: "Execution" | "Validation",
  orderedVertexIds: number[],
  executionGraph: IGraph<T>,
  context: C,
  resultAccumulator: Map<number, any>,
  vistitorAction: (
    executionVertex: T,
    resultAccumulator: Map<number, any>,
    context: C
  ) => Promise<VertexVisitResult>,
  afterAction?: (
    executionVertex: T,
    kind: "success" | "failure",
    err?: unknown
  ) => void
): Promise<VisitResult> {
  for (const vertexId of orderedVertexIds) {
    const vertex = executionGraph.vertexes.get(vertexId);

    if (vertex === undefined) {
      // TODO: this shouldn't happen, so lets figure that out
      continue;
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
        _kind: "failure",
        failures: [`${phase} failed`, [vertexVisitResult.failure]],
      };
    }

    resultAccumulator.set(vertexId, vertexVisitResult.result);

    if (afterAction !== undefined) {
      afterAction(vertex, "success");
    }
  }

  return { _kind: "success", result: resultAccumulator };
}
