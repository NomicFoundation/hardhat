import {
  SerializedDeploymentResult,
  SerializedRecipeResult,
} from "./serialization";

export interface IgnitionRecipesResults {
  load: (recipeId: string) => Promise<SerializedRecipeResult | undefined>;
  save: (
    recipeId: string,
    recipeResult: SerializedRecipeResult
  ) => Promise<void>;
}

export type DeploymentResult =
  | { _kind: "failure"; failures: [string, Error[]] }
  | { _kind: "hold"; holds: [string, string[]] }
  | { _kind: "success"; result: SerializedDeploymentResult };
