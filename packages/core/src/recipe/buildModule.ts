import type { Module, ModuleDict } from "types/module";
import type { IRecipeGraphBuilder } from "types/recipeGraph";

export function buildModule(
  moduleName: string,
  moduleFunc: (m: IRecipeGraphBuilder) => ModuleDict
): Module {
  return {
    name: moduleName,
    moduleAction: moduleFunc,
  };
}
