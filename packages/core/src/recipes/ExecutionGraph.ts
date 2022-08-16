import { Executor } from "../executors/Executor";
import { ParamFuture } from "../futures/ParamFuture";

import { IgnitionRecipe } from "./IgnitionRecipe";

export class ExecutionGraph {
  private _recipes: Map<string, Map<string, Executor>> = new Map();
  private _dependencies: Map<string, Set<string>> = new Map();

  public addExecutor(executor: Executor) {
    const recipeId = executor.future.recipeId;
    let executorsMap = this._recipes.get(recipeId);
    if (executorsMap === undefined) {
      executorsMap = new Map();
      this._recipes.set(recipeId, executorsMap);
    }

    if (executorsMap.has(executor.future.id)) {
      if (executor.future instanceof ParamFuture) {
        if (executor.future.input.defaultValue === undefined) {
          throw new Error(
            `A parameter should only be retrieved once, but found more than one call to getParam for "${executor.future.id}"`
          );
        } else {
          throw new Error(
            `An optional parameter should only be retrieved once, but found more than one call to getParam for "${executor.future.id}"`
          );
        }
      } else {
        throw new Error(
          `Executor with id ${executor.future.id} already exists`
        );
      }
    }

    const dependencies = executor.future.getDependencies();
    for (const dependency of dependencies) {
      this._addDependency(recipeId, dependency.recipeId);
    }

    executorsMap.set(executor.future.id, executor);
  }

  public getRecipe(recipeId: string): IgnitionRecipe | undefined {
    const executorsMap = this._recipes.get(recipeId);
    if (executorsMap === undefined) {
      return undefined;
    }

    return new IgnitionRecipe(recipeId, [...executorsMap.values()]);
  }

  public getSortedRecipes(): IgnitionRecipe[] {
    const added = new Set<string>();
    const ignitionRecipes = this._getRecipes();
    const sortedRecipes: IgnitionRecipe[] = [];

    while (added.size < ignitionRecipes.length) {
      for (const ignitionRecipe of ignitionRecipes) {
        if (added.has(ignitionRecipe.id)) {
          continue;
        }

        const dependencies =
          this._dependencies.get(ignitionRecipe.id) ?? new Set();
        if ([...dependencies].every((d) => added.has(d))) {
          sortedRecipes.push(ignitionRecipe);
          added.add(ignitionRecipe.id);
        }
      }
    }

    return sortedRecipes;
  }

  private _addDependency(recipeId: string, dependencyRecipeId: string) {
    if (recipeId !== dependencyRecipeId) {
      const dependencies =
        this._dependencies.get(recipeId) ?? new Set<string>();
      dependencies.add(dependencyRecipeId);
      this._dependencies.set(recipeId, dependencies);
    }
  }

  private _getRecipes(): IgnitionRecipe[] {
    return [...this._recipes.entries()].map(
      ([id, executorsMap]) => new IgnitionRecipe(id, [...executorsMap.values()])
    );
  }
}
