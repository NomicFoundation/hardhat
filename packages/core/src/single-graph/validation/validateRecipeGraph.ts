import { IRecipeGraph } from "../types/recipeGraph";

export type ValidateRecipeGraphResult =
  | {
      _kind: "success";
    }
  | {
      _kind: "failure";
      failures: [string, Error[]];
    };

export function validateRecipeGraph(
  _recipeGraph: IRecipeGraph
): ValidateRecipeGraphResult {
  return { _kind: "success" };
}
