import { IGraph } from "../types/graph";

import { topologicalSort } from "./adjacencyList";

export function getSortedVertexIdsFrom<T>(executionGraph: IGraph<T>): number[] {
  const orderedIds = topologicalSort(executionGraph.adjacencyList);

  const totalOrderedIds = Array.from(executionGraph.vertexes.keys())
    .filter((k) => !orderedIds.includes(k))
    .concat(orderedIds);

  return totalOrderedIds;
}
