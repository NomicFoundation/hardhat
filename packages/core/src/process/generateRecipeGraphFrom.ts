import { RecipeGraphBuilder } from "recipe/RecipeGraphBuilder";
import { FutureDict } from "types/future";
import type {
  RecipeGraphBuilderOptions,
  Recipe,
  IRecipeGraph,
} from "types/recipeGraph";

export function generateRecipeGraphFrom(
  recipe: Recipe,
  builderOptions: RecipeGraphBuilderOptions
): { graph: IRecipeGraph; recipeOutputs: FutureDict } {
  const graphBuilder = new RecipeGraphBuilder(builderOptions);

  const recipeOutputs = recipe.recipeAction(graphBuilder);

  return { graph: graphBuilder.graph, recipeOutputs };
}
