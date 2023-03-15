import { DeploymentGraph } from "../../dsl/DeploymentGraph";
import { eliminate } from "../../graph/adjacencyList";
import { DeploymentGraphVertex } from "../../types/deploymentGraph";

/**
 * Deployment graphs can have virtual vertex that represent the
 * execution of all vertex in a module/subgraph.
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
 * @param deploymentGraph the deployment graph with virtual vertexes
 * @returns a reduced deployment graph
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
