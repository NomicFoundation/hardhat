import setupDebug from "debug";

import { execute } from "execution/execute";
import { FileJournal } from "journal/FileJournal";
import { InMemoryJournal } from "journal/InMemoryJournal";
import { generateRecipeGraphFrom } from "process/generateRecipeGraphFrom";
import { transformRecipeGraphToExecutionGraph } from "process/transformRecipeGraphToExecutionGraph";
import { createServices } from "services/createServices";
import { Services } from "services/types";
import { DeploymentResult, IgnitionRecipesResults } from "types/deployment";
import { DependableFuture, FutureDict } from "types/future";
import { Providers } from "types/providers";
import { Recipe } from "types/recipeGraph";
import { SerializedDeploymentResult } from "types/serialization";
import { UiService } from "ui/ui-service";
import { isDependable } from "utils/guards";
import { serializeFutureOutput } from "utils/serialize";
import { validateRecipeGraph } from "validation/validateRecipeGraph";

const log = setupDebug("ignition:main");

export interface IgnitionDeployOptions {
  pathToJournal: string | undefined;
  txPollingInterval: number;
  ui: boolean;
}

type RecipesOutputs = Record<string, any>;

export class Ignition {
  constructor(
    private _providers: Providers,
    private _recipesResults: IgnitionRecipesResults
  ) {}

  public async deploy(
    recipe: Recipe,
    options: IgnitionDeployOptions = {
      ui: true,
      pathToJournal: undefined,
      txPollingInterval: 300,
    }
  ): Promise<[DeploymentResult, RecipesOutputs]> {
    log(`Start deploy`);

    const ui = new UiService({ enabled: options.ui });

    log("Create journal with path '%s'", options.pathToJournal);

    const journal =
      options.pathToJournal !== undefined
        ? new FileJournal(options.pathToJournal)
        : new InMemoryJournal();

    const serviceOptions = {
      providers: this._providers,
      journal,
      txPollingInterval: 300,
    };

    const services: Services = createServices(
      "recipeIdEXECUTE",
      "executorIdEXECUTE",
      serviceOptions
    );

    const chainId = await this._getChainId();
    log("ChainId resolved as '%s'", chainId);

    log("Generate recipe graph from recipe");

    const { graph: recipeGraph, recipeOutputs } = generateRecipeGraphFrom(
      recipe,
      { chainId }
    );

    log("Validate recipe graph");
    const validationResult = await validateRecipeGraph(recipeGraph, services);

    if (validationResult._kind === "failure") {
      return [validationResult, {}];
    }

    log("Transform recipe graph to execution graph");
    const transformResult = await transformRecipeGraphToExecutionGraph(
      recipeGraph,
      services
    );

    if (transformResult._kind === "failure") {
      return [transformResult, {}];
    }

    const { executionGraph } = transformResult;

    log("Execute based on execution graph");
    const executionResult = await execute(
      executionGraph,
      services,
      ui,
      this._recipesResults
    );

    if (executionResult._kind === "failure") {
      return [executionResult, {}];
    }

    const serializedDeploymentResult = this._serialize(
      recipeOutputs,
      executionResult.result
    );

    return [{ _kind: "success", result: serializedDeploymentResult }, {}];
  }

  public async plan(recipe: Recipe) {
    log(`Start plan`);

    const serviceOptions = {
      providers: this._providers,
      journal: new InMemoryJournal(),
      txPollingInterval: 300,
    };

    const services: Services = createServices(
      "recipeIdEXECUTE",
      "executorIdEXECUTE",
      serviceOptions
    );

    const chainId = await this._getChainId();

    const { graph: recipeGraph } = generateRecipeGraphFrom(recipe, { chainId });

    const validationResult = await validateRecipeGraph(recipeGraph, services);

    if (validationResult._kind === "failure") {
      return [validationResult, {}];
    }

    const transformResult = await transformRecipeGraphToExecutionGraph(
      recipeGraph,
      services
    );

    if (transformResult._kind === "failure") {
      return [transformResult, {}];
    }

    const { executionGraph } = transformResult;

    return { recipeGraph, executionGraph };
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
    const entries = Object.entries(recipeOutputs).filter(
      (entry): entry is [string, DependableFuture] => isDependable(entry[1])
    );

    const convertedEntries = entries.map(([name, future]) => {
      const executionResultValue = result.get(future.vertexId);

      return [name, serializeFutureOutput(executionResultValue)];
    });

    return Object.fromEntries(convertedEntries);
  }
}
