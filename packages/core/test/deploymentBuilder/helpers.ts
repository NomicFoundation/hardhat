import { DeploymentGraph } from "dsl/DeploymentGraph";
import { getDependenciesFor } from "graph/adjacencyList";
import { DeploymentGraphVertex } from "types/deploymentGraph";
import { VertexDescriptor } from "types/graph";

export function getDeploymentVertexByLabel(
  deploymentGraph: DeploymentGraph,
  label: string
): DeploymentGraphVertex | undefined {
  return Array.from(deploymentGraph.vertexes.values()).find(
    (n) => n.label === label
  );
}

export function getDependenciesForVertex(
  deploymentGraph: DeploymentGraph,
  { id }: { id: number }
): VertexDescriptor[] {
  const depIds = getDependenciesFor(deploymentGraph.adjacencyList, id);

  return depIds
    .map((depId) => deploymentGraph.vertexes.get(depId))
    .filter(
      (nodeDesc): nodeDesc is DeploymentGraphVertex => nodeDesc !== undefined
    )
    .map((vertex) => ({ id: vertex.id, label: vertex.label, type: "" }));
}
