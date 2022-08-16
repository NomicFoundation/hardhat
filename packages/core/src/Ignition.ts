import setupDebug from "debug";

import {
  DeploymentPlan,
  DeploymentResult,
  ExecutionEngine,
  ExecutionManager,
  IgnitionRecipesResults,
} from "./execution-engine";
import { FileJournal } from "./journal/FileJournal";
import { InMemoryJournal } from "./journal/InMemoryJournal";
import { Providers } from "./providers";
import { RecipeBuilderImpl } from "./recipes/RecipeBuilderImpl";
import { UserRecipe } from "./recipes/UserRecipe";

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

  private async _getChainId(): Promise<number> {
    const result = await this._providers.ethereumProvider.request({
      method: "eth_chainId",
    });

    return Number(result);
  }
}
