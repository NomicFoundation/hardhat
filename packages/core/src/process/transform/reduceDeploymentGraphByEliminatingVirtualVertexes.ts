import { DeploymentGraph } from "dsl/DeploymentGraph";
import { eliminate } from "graph/adjacencyList";
import { DeploymentGraphVertex } from "types/deploymentGraph";

/**
 * Recipe graphs can have virtual vertex that represent the
 * execution of all vertex in a recipe.
 *
 * We reduce the graph to remove the virtual nodes, by adding
 * edges from any dependents to the virtual nodes dependents:
 *
 *     A       B     A     B
 *     │       │     │     │
 *     └──►V◄──┘  ~  └─►C◄─┘
 *         │      ~
 *         ▼
 *         C
 *
 * @param deploymentGraph the recipe graph with recipe virtual vertexes
 * @returns a reduced recipe graph
 */
export function reduceDeploymentGraphByEliminatingVirtualVertexes(
  deploymentGraph: DeploymentGraph
): DeploymentGraph {
  const virtualVertexes = [...deploymentGraph.vertexes.values()].filter(
    (v) => v.type === "Virtual"
  );

  for (const virtualVertex of virtualVertexes) {
    eliminateVirtualVertexFrom(deploymentGraph, virtualVertex);
  }

  return deploymentGraph;
}

function eliminateVirtualVertexFrom(
  deploymentGraph: DeploymentGraph,
  virtualVertex: DeploymentGraphVertex
): void {
  deploymentGraph.adjacencyList = eliminate(
    deploymentGraph.adjacencyList,
    virtualVertex.id
  );

  deploymentGraph.vertexes.delete(virtualVertex.id);
}
