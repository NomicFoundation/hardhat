import type { FutureDict } from "types/future";
import type { IRecipeGraphBuilder, Recipe } from "types/recipeGraph";

export function buildRecipe(
  recipeName: string,
  recipeFunc: (m: IRecipeGraphBuilder) => FutureDict
): Recipe {
  return {
    name: recipeName,
    recipeAction: recipeFunc,
  };
}
