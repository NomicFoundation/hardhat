import { ExecutionVertex, IExecutionGraph } from "../types/executionGraph";
import { IRecipeGraph, RecipeVertex } from "../types/recipeGraph";
import {
  AdjacencyList,
  clone,
  constructEmptyAdjacencyList,
} from "../utils/adjacencyList";

export class ExecutionGraph implements IExecutionGraph {
  public adjacencyList: AdjacencyList;
  public vertexes: Map<number, ExecutionVertex>;

  private constructor() {
    this.adjacencyList = constructEmptyAdjacencyList();
    this.vertexes = new Map<number, ExecutionVertex>();
  }

  public static async from(
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
}
