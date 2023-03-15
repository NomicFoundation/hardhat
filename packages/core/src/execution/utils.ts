import hash from "object-hash";

import { ExecutionGraph } from "../execution/ExecutionGraph";
import { getDependenciesFor } from "../graph/adjacencyList";
import { serializeReplacer } from "../utils/serialize";

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

export function hashExecutionGraph(executionGrpah: ExecutionGraph) {
  return hash(JSON.parse(JSON.stringify(executionGrpah, serializeReplacer)));
}
