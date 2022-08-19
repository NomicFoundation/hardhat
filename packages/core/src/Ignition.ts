import setupDebug from "debug";

import {
  DeploymentPlan,
  DeploymentResult,
  ExecutionEngine,
  ExecutionManager,
  IgnitionRecipesResults,
} from "./execution-engine";
import { SerializedDeploymentResult } from "./futures/types";
import { serializeFutureOutput } from "./futures/utils";
import { FileJournal } from "./journal/FileJournal";
import { InMemoryJournal } from "./journal/InMemoryJournal";
import { Providers } from "./providers";
import { RecipeBuilderImpl } from "./recipes/RecipeBuilderImpl";
import { UserRecipe } from "./recipes/UserRecipe";
import { execute } from "./single-graph/execution/execute";
import { generateRecipeGraphFrom } from "./single-graph/recipe/generateRecipeGraphFrom";
import { transformRecipeGraphToExecutionGraph } from "./single-graph/transform/transformRecipeGraphToExecutionGraph";
import { FutureDict } from "./single-graph/types/future";
import { validateRecipeGraph } from "./single-graph/validation/validateRecipeGraph";

const log = setupDebug("ignition:main");

export interface IgnitionDeployOptions {
  pathToJournal: string | undefined;
  txPollingInterval: number;
}

type RecipesOutputs = Record<string, any>;

export class Ignition {
  constructor(
    private _providers: Providers,
    private _recipesResults: IgnitionRecipesResults
  ) {}

  public async deploy(
    userRecipes: Array<UserRecipe<any>>,
    { pathToJournal, txPollingInterval }: IgnitionDeployOptions
  ): Promise<[DeploymentResult, RecipesOutputs]> {
    log(`Start deploy, '${userRecipes.length}' recipes`);

    const chainId = await this._getChainId();

    const m = new RecipeBuilderImpl(chainId);

    const recipesOutputs: RecipesOutputs = {};

    for (const userRecipe of userRecipes) {
      log("Load recipe '%s'", userRecipe.id);
      const recipeOutput = m.useRecipe(userRecipe) ?? {};
      recipesOutputs[userRecipe.id] = recipeOutput;
    }

    log("Build execution graph");
    const executionGraph = m.buildExecutionGraph();

    log("Create journal with path '%s'", pathToJournal);
    const journal =
      pathToJournal !== undefined
        ? new FileJournal(pathToJournal)
        : new InMemoryJournal();

    const engine = new ExecutionEngine(
      this._providers,
      journal,
      this._recipesResults,
      {
        parallelizationLevel: 2,
        loggingEnabled: pathToJournal !== undefined,
        txPollingInterval,
      }
    );

    const executionManager = new ExecutionManager(
      engine,
      txPollingInterval / 5
    );

    log("Execute deployment");
    const deploymentResult = await executionManager.execute(executionGraph);

    return [deploymentResult, recipesOutputs];
  }

  public async buildPlan(
    userRecipes: Array<UserRecipe<any>>
  ): Promise<DeploymentPlan> {
    log(`Start building plan, '${userRecipes.length}' recipes`);

    const chainId = await this._getChainId();

    const m = new RecipeBuilderImpl(chainId);

    for (const userRecipe of userRecipes) {
      log("Load recipe '%s'", userRecipe.id);
      m.useRecipe(userRecipe);
    }

    log("Build ExecutionGraph");
    const executionGraph = m.buildExecutionGraph();

    return ExecutionEngine.buildPlan(executionGraph, this._recipesResults);
  }

  public async deploySingleGraph(
    recipe: any
  ): Promise<[DeploymentResult, any]> {
    log(`Start deploy`);

    const chainId = await this._getChainId();

    const { graph: recipeGraph, recipeOutputs } = generateRecipeGraphFrom(
      recipe,
      { chainId }
    );

    const validationResult = validateRecipeGraph(recipeGraph);

    if (validationResult._kind === "failure") {
      return [validationResult, {}];
    }

    const serviceOptions = {
      providers: this._providers,
      journal: new InMemoryJournal(),
      txPollingInterval: 300,
    };

    const transformResult = await transformRecipeGraphToExecutionGraph(
      recipeGraph,
      serviceOptions
    );

    if (transformResult._kind === "failure") {
      return [transformResult, {}];
    }

    const { executionGraph } = transformResult;

    const executionResult = await execute(executionGraph, serviceOptions);

    if (executionResult._kind === "failure") {
      return [executionResult, {}];
    }

    const serializedDeploymentResult = this._serialize(
      recipeOutputs,
      executionResult.result
    );

    return [{ _kind: "success", result: serializedDeploymentResult }, {}];
  }

  public async planSingleGraph(recipe: any) {
    log(`Start deploy`);

    const chainId = await this._getChainId();

    const { graph: recipeGraph } = generateRecipeGraphFrom(recipe, { chainId });

    const validationResult = validateRecipeGraph(recipeGraph);

    if (validationResult._kind === "failure") {
      return [validationResult, {}];
    }

    const serviceOptions = {
      providers: this._providers,
      journal: new InMemoryJournal(),
      txPollingInterval: 300,
    };

    const transformResult = await transformRecipeGraphToExecutionGraph(
      recipeGraph,
      serviceOptions
    );

    if (transformResult._kind === "failure") {
      return [transformResult, {}];
    }

    const { executionGraph } = transformResult;

    return executionGraph;
  }

  private async _getChainId(): Promise<number> {
    const result = await this._providers.ethereumProvider.request({
      method: "eth_chainId",
    });

    return Number(result);
  }

  private _serialize(
    recipeOutputs: FutureDict,
    result: Map<number, any>
  ): SerializedDeploymentResult {
    const convertedEntries = Object.entries(recipeOutputs).map(
      ([name, future]) => {
        const executionResultValue = result.get(future.id);

        return [name, serializeFutureOutput(executionResultValue)];
      }
    );

    return Object.fromEntries(convertedEntries);
  }
}
