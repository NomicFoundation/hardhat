import { ExecutionGraph } from "execution/ExecutionGraph";
import { clone } from "graph/adjacencyList";
import { Services } from "services/types";
import { ExecutionVertex, IExecutionGraph } from "types/executionGraph";
import { TransformResult } from "types/process";
import { IRecipeGraph, RecipeVertex } from "types/recipeGraph";

import { convertRecipeVertexToExecutionVertex } from "./transform/convertRecipeVertexToExecutionVertex";
import { reduceRecipeGraphByEliminatingVirtualVertexes } from "./transform/reduceRecipeGraphByEliminatingVirtualVertexes";

export async function transformRecipeGraphToExecutionGraph(
  recipeGraph: IRecipeGraph,
  services: Services
): Promise<TransformResult> {
  const reducedRecipeGraph =
    reduceRecipeGraphByEliminatingVirtualVertexes(recipeGraph);

  const executionGraph: IExecutionGraph = await convertRecipeToExecution(
    reducedRecipeGraph,
    convertRecipeVertexToExecutionVertex({
      services,
      graph: reducedRecipeGraph,
    })
  );

  return { _kind: "success", executionGraph };
}

async function convertRecipeToExecution(
  recipeGraph: IRecipeGraph,
  convert: (vertex: RecipeVertex) => Promise<ExecutionVertex>
) {
  const executionGraph = new ExecutionGraph();
  executionGraph.adjacencyList = clone(recipeGraph.adjacencyList);

  for (const [id, recipeVertex] of recipeGraph.vertexes.entries()) {
    const executionVertex = await convert(recipeVertex);

    executionGraph.vertexes.set(id, executionVertex);
  }

  return executionGraph;
}
