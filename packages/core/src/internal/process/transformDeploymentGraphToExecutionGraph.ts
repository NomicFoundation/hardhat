import { ProcessStepResult } from "../../types/process";
import { ExecutionGraph } from "../execution/ExecutionGraph";
import { clone } from "../graph/adjacencyList";
import {
  DeploymentGraphVertex,
  IDeploymentGraph,
} from "../types/deploymentGraph";
import { ExecutionVertex, IExecutionGraph } from "../types/executionGraph";
import { Services } from "../types/services";
import {
  processStepErrored,
  processStepSucceeded,
} from "../utils/process-results";

import { convertDeploymentVertexToExecutionVertex } from "./transform/convertDeploymentVertexToExecutionVertex";
import { reduceDeploymentGraphByEliminatingVirtualVertexes } from "./transform/reduceDeploymentGraphByEliminatingVirtualVertexes";

export async function transformDeploymentGraphToExecutionGraph(
  deploymentGraph: IDeploymentGraph,
  services: Services
): Promise<ProcessStepResult<{ executionGraph: IExecutionGraph }>> {
  try {
    const reducedDeploymentGraph =
      reduceDeploymentGraphByEliminatingVirtualVertexes(deploymentGraph);

    const executionGraph: IExecutionGraph = await convertDeploymentToExecution(
      reducedDeploymentGraph,
      convertDeploymentVertexToExecutionVertex({
        services,
        graph: reducedDeploymentGraph,
      })
    );

    return processStepSucceeded({ executionGraph });
  } catch (err) {
    return processStepErrored(
      err,
      "Graph transformation and simplification failed"
    );
  }
}

async function convertDeploymentToExecution(
  deploymentGraph: IDeploymentGraph,
  convert: (vertex: DeploymentGraphVertex) => Promise<ExecutionVertex>
) {
  const executionGraph = new ExecutionGraph();
  executionGraph.adjacencyList = clone(deploymentGraph.adjacencyList);

  for (const [id, deploymentVertex] of deploymentGraph.vertexes.entries()) {
    const executionVertex = await convert(deploymentVertex);

    executionGraph.vertexes.set(id, executionVertex);
  }

  return executionGraph;
}
