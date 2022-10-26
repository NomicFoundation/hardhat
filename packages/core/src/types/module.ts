import type { CallableFuture } from "./future";
import type { IRecipeGraphBuilder } from "./recipeGraph";

export interface ModuleDict {
  [key: string]: CallableFuture;
}

export interface Module {
  name: string;
  moduleAction: (builder: IRecipeGraphBuilder) => ModuleDict;
}

export interface ModuleData {
  result: ModuleDict;
  optionsHash: string;
}

export interface ModuleCache {
  [label: string]: ModuleData;
}
