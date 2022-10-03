import setupDebug from "debug";

import { Deployment } from "deployment/Deployment";
import { execute } from "execution/execute";
import { InMemoryJournal } from "journal/InMemoryJournal";
import { generateRecipeGraphFrom } from "process/generateRecipeGraphFrom";
import { transformRecipeGraphToExecutionGraph } from "process/transformRecipeGraphToExecutionGraph";
import { createServices } from "services/createServices";
import { Services } from "services/types";
import { DeploymentResult, UpdateUiAction } from "types/deployment";
import { DependableFuture, FutureDict } from "types/future";
import { VertexVisitResult } from "types/graph";
import { IgnitionPlan } from "types/plan";
import { Providers } from "types/providers";
import { Recipe } from "types/recipeGraph";
import { SerializedFutureResult } from "types/serialization";
import { isDependable } from "utils/guards";
import { serializeFutureOutput } from "utils/serialize";
import { validateRecipeGraph } from "validation/validateRecipeGraph";

const log = setupDebug("ignition:main");

export interface IgnitionDeployOptions {
  pathToJournal: string | undefined;
  txPollingInterval: number;
  ui?: UpdateUiAction;
}

type RecipesOutputs = Record<string, any>;

export class Ignition {
  constructor(private _providers: Providers) {}

  public async deploy(
    recipe: Recipe,
    givenOptions?: IgnitionDeployOptions
  ): Promise<[DeploymentResult, RecipesOutputs]> {
    log(`Start deploy`);

    const options = {
      pathToJournal: undefined,
      txPollingInterval: 300,
      ui: undefined,
      ...givenOptions,
    };

    const deployment = new Deployment(
      recipe,
      Deployment.setupServices(options, this._providers),
      options.ui
    );

    const chainId = await this._getChainId();
    deployment.setChainId(chainId);

    const { result: constructResult, recipeOutputs } =
      await this._constructExecutionGraphFrom(deployment, recipe);

    if (constructResult._kind === "failure") {
      return [constructResult, {}];
    }

    deployment.transformComplete(constructResult.executionGraph);

    log("Execute based on execution graph");
    const executionResult = await execute(deployment);

    if (executionResult._kind === "failure") {
      return [executionResult, {}];
    }

    const serializedDeploymentResult = this._serialize(
      recipeOutputs,
      executionResult.result
    );

    return [{ _kind: "success", result: serializedDeploymentResult }, {}];
  }

  public async plan(recipe: Recipe): Promise<IgnitionPlan> {
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
      throw new Error(validationResult.failures[0]);
    }

    const transformResult = await transformRecipeGraphToExecutionGraph(
      recipeGraph,
      services
    );

    if (transformResult._kind === "failure") {
      throw new Error(transformResult.failures[0]);
    }

    const { executionGraph } = transformResult;

    return { recipeGraph, executionGraph };
  }

  private async _constructExecutionGraphFrom(
    deployment: Deployment,
    recipe: Recipe
  ): Promise<{ result: any; recipeOutputs: FutureDict }> {
    log("Generate recipe graph from recipe");
    const { graph: recipeGraph, recipeOutputs } = generateRecipeGraphFrom(
      recipe,
      { chainId: deployment.state.details.chainId }
    );

    deployment.startValidation();
    const validationResult = await validateRecipeGraph(
      recipeGraph,
      deployment.services
    );

    if (validationResult._kind === "failure") {
      deployment.failValidation(validationResult.failures[1]);

      return { result: validationResult, recipeOutputs };
    }

    log("Transform recipe graph to execution graph");
    const transformResult = await transformRecipeGraphToExecutionGraph(
      recipeGraph,
      deployment.services
    );

    return { result: transformResult, recipeOutputs };
  }

  private async _getChainId(): Promise<number> {
    const result = await this._providers.ethereumProvider.request({
      method: "eth_chainId",
    });

    return Number(result);
  }

  private _serialize(
    recipeOutputs: FutureDict,
    result: Map<number, VertexVisitResult>
  ) {
    const entries = Object.entries(recipeOutputs).filter(
      (entry): entry is [string, DependableFuture] => isDependable(entry[1])
    );

    const convertedEntries: Array<[string, SerializedFutureResult]> = entries
      .map(([name, future]): [string, SerializedFutureResult] | null => {
        const executionResultValue = result.get(future.vertexId);

        if (
          executionResultValue === undefined ||
          executionResultValue._kind === "failure"
        ) {
          return null;
        }

        const serializedOutput: SerializedFutureResult = serializeFutureOutput(
          executionResultValue.result
        );

        return [name, serializedOutput];
      })
      .filter((x): x is [string, SerializedFutureResult] => x !== null);

    return Object.fromEntries(convertedEntries);
  }
}
