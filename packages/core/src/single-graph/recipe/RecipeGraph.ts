import { Graph } from "../graph/Graph";
import { RecipeFuture } from "../types/future";
import { RecipeVertex } from "../types/recipeGraph";

export class RecipeGraph extends Graph<RecipeVertex> {
  public registeredParameters: {
    [key: string]: { [key: string]: string | number | RecipeFuture };
  };

  constructor() {
    super();

    this.registeredParameters = {};
  }
}
