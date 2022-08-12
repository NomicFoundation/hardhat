import type {
  RecipeGraphBuilderOptions,
  Recipe,
  IRecipeGraph,
} from "../types/recipeGraph";

import { RecipeGraphBuilder } from "./RecipeGraphBuilder";

export function generateRecipeGraphFrom(
  recipe: Recipe,
  builderOptions: RecipeGraphBuilderOptions
): IRecipeGraph {
  const graphBuilder = new RecipeGraphBuilder(builderOptions);

  recipe.steps(graphBuilder);

  const graph = graphBuilder.graph;

  return graph;
}
