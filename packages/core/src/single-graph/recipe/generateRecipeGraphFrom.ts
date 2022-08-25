import { FutureDict } from "../types/future";
import type {
  RecipeGraphBuilderOptions,
  Recipe,
  IRecipeGraph,
} from "../types/recipeGraph";

import { RecipeGraphBuilder } from "./RecipeGraphBuilder";

export function generateRecipeGraphFrom(
  recipe: Recipe,
  builderOptions: RecipeGraphBuilderOptions
): { graph: IRecipeGraph; recipeOutputs: FutureDict } {
  const graphBuilder = new RecipeGraphBuilder(builderOptions);

  const recipeOutputs = recipe.steps(graphBuilder);

  return { graph: graphBuilder.graph, recipeOutputs };
}
