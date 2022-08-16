import { UserRecipe } from "./UserRecipe";
import { RecipeDefinition } from "./types";

export function buildRecipe<T>(
  recipeId: string,
  recipeDefinition: RecipeDefinition<T>
): UserRecipe<T> {
  return new UserRecipe(recipeId, recipeDefinition);
}
