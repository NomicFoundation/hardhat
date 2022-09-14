import { IExecutionGraph } from "./executionGraph";
import { IRecipeGraph } from "./recipeGraph";

export interface IgnitionPlan {
  recipeGraph: IRecipeGraph;
  executionGraph: IExecutionGraph;
}
