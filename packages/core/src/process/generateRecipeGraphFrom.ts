import { RecipeGraphBuilder } from "recipe/RecipeGraphBuilder";
import { FutureDict } from "types/future";
import { Module } from "types/module";
import type {
  RecipeGraphBuilderOptions,
  IRecipeGraph,
} from "types/recipeGraph";

export function generateRecipeGraphFrom(
  ignitionModule: Module,
  builderOptions: RecipeGraphBuilderOptions
): { graph: IRecipeGraph; recipeOutputs: FutureDict } {
  const graphBuilder = new RecipeGraphBuilder(builderOptions);

  const recipeOutputs = ignitionModule.moduleAction(graphBuilder);

  return { graph: graphBuilder.graph, recipeOutputs };
}
