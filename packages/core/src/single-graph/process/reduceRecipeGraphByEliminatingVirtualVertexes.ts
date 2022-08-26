import { eliminate } from "../graph/adjacencyList";
import { RecipeGraph } from "../recipe/RecipeGraph";
import { RecipeVertex } from "../types/recipeGraph";

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
 * @param recipeGraph the recipe graph with recipe virtual vertexes
 * @returns a reduced recipe graph
 */
export function reduceRecipeGraphByEliminatingVirtualVertexes(
  recipeGraph: RecipeGraph
): RecipeGraph {
  const virtualVertexes = [...recipeGraph.vertexes.values()].filter(
    (v) => v.type === "Virtual"
  );

  for (const virtualVertex of virtualVertexes) {
    eliminateVirtualVertexFrom(recipeGraph, virtualVertex);
  }

  return recipeGraph;
}

function eliminateVirtualVertexFrom(
  recipeGraph: RecipeGraph,
  virtualVertex: RecipeVertex
): void {
  recipeGraph.adjacencyList = eliminate(
    recipeGraph.adjacencyList,
    virtualVertex.id
  );

  recipeGraph.vertexes.delete(virtualVertex.id);
}
