import { RecipeDefinition } from "./types";

export class UserRecipe<T> {
  public readonly version = 1;

  constructor(
    public readonly id: string,
    public readonly definition: RecipeDefinition<T>
  ) {}
}
