import { ExecutionGraph } from "execution/ExecutionGraph";
import { getDependenciesFor } from "graph/adjacencyList";

export function allDependenciesCompleted(
  vertexId: number,
  executionGraph: ExecutionGraph,
  completed: Set<number>
) {
  const depenencies = getDependenciesFor(
    executionGraph.adjacencyList,
    vertexId
  );

  return depenencies.every((vid) => completed.has(vid));
}
