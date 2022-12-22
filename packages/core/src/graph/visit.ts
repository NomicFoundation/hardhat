import {
  IGraph,
  ResultsAccumulator,
  VertexVisitResult,
  VisitResult,
} from "types/graph";

export async function visit<T, C>(
  phase: "Execution" | "Validation",
  orderedVertexIds: number[],
  graph: IGraph<T>,
  context: C,
  resultAccumulator: ResultsAccumulator,
  vistitorAction: (
    vertex: T,
    resultAccumulator: ResultsAccumulator,
    context: C
  ) => Promise<VertexVisitResult>,
  afterAction?: (vertex: T, kind: "success" | "failure", err?: unknown) => void
): Promise<VisitResult> {
  for (const vertexId of orderedVertexIds) {
    const vertex = graph.vertexes.get(vertexId);

    if (vertex === undefined) {
      throw new Error(`Could not get vertex ${vertexId}`);
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

    if (vertexVisitResult._kind === "hold") {
      return {
        _kind: "hold",
        holds: [vertex as any],
      };
    }

    resultAccumulator.set(vertexId, vertexVisitResult.result);

    if (afterAction !== undefined) {
      afterAction(vertex, "success");
    }
  }

  return { _kind: "success", result: resultAccumulator };
}
