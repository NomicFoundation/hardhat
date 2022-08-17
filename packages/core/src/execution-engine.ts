import setupDebug from "debug";

import { DeploymentState } from "./deployment-state";
import { InternalFuture } from "./futures/InternalFuture";
import type {
  RecipeResult,
  SerializedDeploymentResult,
  SerializedRecipeResult,
} from "./futures/types";
import { deserializeFutureOutput } from "./futures/utils";
import { Journal } from "./journal/types";
import { Providers } from "./providers";
import { ExecutionGraph } from "./recipes/ExecutionGraph";
import { IgnitionRecipe } from "./recipes/IgnitionRecipe";
import { ArtifactsService } from "./services/ArtifactsService";
import { ConfigService } from "./services/ConfigService";
import { ContractsService } from "./services/ContractsService";
import { TransactionsService } from "./services/TransactionsService";
import type { Services } from "./services/types";
import { TxSender } from "./tx-sender";
import { UiService } from "./ui/ui-service";
import { sleep } from "./utils";

export interface IgnitionRecipesResults {
  load: (recipeId: string) => Promise<SerializedRecipeResult | undefined>;
  save: (
    recipeId: string,
    recipeResult: SerializedRecipeResult
  ) => Promise<void>;
}

export interface ExecutionEngineOptions {
  parallelizationLevel: number;
  loggingEnabled: boolean;
  txPollingInterval: number;
}

interface ExecutorPlan {
  id: string;
  description: string;
}
type RecipePlan = "already-deployed" | ExecutorPlan[];
export type DeploymentPlan = Record<string, RecipePlan>;

export class ExecutionEngine {
  private _debug = setupDebug("ignition:execution-engine");

  public static async buildPlan(
    executionGraph: ExecutionGraph,
    recipesResults: IgnitionRecipesResults
  ): Promise<DeploymentPlan> {
    const plan: DeploymentPlan = {};

    const ignitionRecipes = executionGraph.getSortedRecipes();

    for (const ignitionRecipe of ignitionRecipes) {
      const recipeResult = await recipesResults.load(ignitionRecipe.id);
      if (recipeResult !== undefined) {
        plan[ignitionRecipe.id] = "already-deployed";
        continue;
      }

      const recipePlan: ExecutorPlan[] = [];
      const executors = ignitionRecipe.getSortedExecutors();
      for (const executor of executors) {
        recipePlan.push({
          id: executor.future.id,
          description: executor.getDescription(),
        });
      }
      plan[ignitionRecipe.id] = recipePlan;
    }

    return plan;
  }

  constructor(
    private _providers: Providers,
    private _journal: Journal,
    private _recipesResults: IgnitionRecipesResults,
    private _options: ExecutionEngineOptions
  ) {}

  public async *execute(executionGraph: ExecutionGraph) {
    const deploymentState = DeploymentState.fromExecutionGraph(executionGraph);

    const executionRecipes = executionGraph.getSortedRecipes();

    const uiService = new UiService({
      enabled: this._options.loggingEnabled,
      deploymentState,
    });

    // validate all recipes
    const errorsPerRecipe: Map<string, string[]> = new Map();
    let hasErrors = false;
    for (const executionRecipe of executionRecipes) {
      this._debug(`Validating recipe ${executionRecipe.id}`);

      const errors = await this._validateRecipe(executionRecipe);

      if (errors.length > 0) {
        hasErrors = true;
      }

      errorsPerRecipe.set(executionRecipe.id, errors);
    }

    if (hasErrors) {
      let errorMessage = `The following validation errors were found:\n`;
      let isFirst = true;
      for (const [recipeId, errors] of errorsPerRecipe.entries()) {
        if (errors.length === 0) {
          continue;
        }
        if (!isFirst) {
          errorMessage += "\n";
        }
        isFirst = false;

        errorMessage += `  In recipe ${recipeId}:\n`;
        for (const error of errors) {
          errorMessage += `    - ${error}\n`;
        }
      }

      throw new Error(errorMessage);
    }

    // execute each recipe sequentially
    for (const executionRecipe of executionRecipes) {
      const serializedRecipeResult = await this._recipesResults.load(
        executionRecipe.id
      );

      if (serializedRecipeResult !== undefined) {
        const recipeResult: RecipeResult = Object.fromEntries(
          Object.entries(serializedRecipeResult).map(([key, value]) => [
            key,
            deserializeFutureOutput(value),
          ])
        );

        deploymentState.addRecipeResult(executionRecipe.id, recipeResult);

        continue;
      }

      this._debug(`Begin execution of recipe ${executionRecipe.id}`);

      if (deploymentState.isRecipeSuccess(executionRecipe.id)) {
        this._debug(
          `The recipe ${executionRecipe.id} was already successfully deployed`
        );
        continue;
      }

      this._debug(`Executing recipe ${executionRecipe.id}`);
      const recipeExecutionGenerator = this._executeRecipe(
        executionRecipe,
        deploymentState,
        uiService
      );
      for await (const recipeResult of recipeExecutionGenerator) {
        if (recipeResult !== undefined) {
          break;
        }
        yield;
      }
    }

    yield deploymentState;
  }

  private async _validateRecipe(
    ignitionRecipe: IgnitionRecipe
  ): Promise<string[]> {
    const executors = ignitionRecipe.getSortedExecutors();
    const allErrors: string[] = [];

    for (const executor of executors) {
      this._debug(
        `Validating future ${executor.future.id} of recipe ${ignitionRecipe.id}`
      );
      const services = this._createServices(
        ignitionRecipe.id,
        executor.future.id
      );

      const errors = await executor.validate(executor.future.input, services);
      if (errors.length > 0) {
        allErrors.push(...errors);
      }
    }

    return allErrors;
  }

  private async *_executeRecipe(
    ignitionRecipe: IgnitionRecipe,
    deploymentState: DeploymentState,
    uiService: UiService
  ) {
    const { parallelizationLevel } = this._options;
    const executors = ignitionRecipe.getSortedExecutors();
    const recipeState = deploymentState.getRecipe(ignitionRecipe.id);

    while (true) {
      const someFailure = executors.some((e) => e.isFailure());
      const someHold = executors.some((e) => e.isHold());
      let runningCount = executors.filter((e) => e.isRunning()).length;
      const allSuccess = executors.every((e) => e.isSuccess());

      if (
        allSuccess ||
        (someFailure && runningCount === 0) ||
        (someHold && runningCount === 0)
      ) {
        if (recipeState.isSuccess()) {
          const recipeResult = recipeState.toRecipeResult();
          await this._recipesResults.save(ignitionRecipe.id, recipeResult);
          await this._journal.delete(ignitionRecipe.id);
        }

        yield recipeState;
      }

      for (const executor of ignitionRecipe.getSortedExecutors()) {
        this._debug(`Check ${ignitionRecipe.id}/${executor.future.id}`);

        if (executor.isReady() && runningCount < parallelizationLevel) {
          this._debug(
            `Check dependencies of ${ignitionRecipe.id}/${executor.future.id}`
          );

          const dependencies = executor.future.getDependencies();

          const allDependenciesReady = dependencies.every((d) =>
            deploymentState.isFutureSuccess(d.recipeId, d.id)
          );

          if (allDependenciesReady) {
            const resolvedInput = this._resolve(
              executor.future.input,
              deploymentState
            );

            const services = this._createServices(
              ignitionRecipe.id,
              executor.future.id
            );

            this._debug(`Start ${ignitionRecipe.id}/${executor.future.id}`);

            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            executor.run(resolvedInput, services, (newState) => {
              deploymentState.setFutureState(
                ignitionRecipe.id,
                executor.future.id,
                newState
              );

              uiService.render();
            });
            runningCount++;
          }
        }
      }

      yield;
    }
  }

  private _resolve(input: any, deploymentResult: DeploymentState): any {
    if (InternalFuture.isFuture(input)) {
      return deploymentResult.getFutureResult(input.recipeId, input.id);
    }

    if (Array.isArray(input)) {
      return input.map((x) => this._resolve(x, deploymentResult));
    }

    if (typeof input === "object" && input !== null) {
      const resolvedInput: any = {};

      for (const [key, value] of Object.entries(input)) {
        resolvedInput[key] = this._resolve(value, deploymentResult);
      }

      return resolvedInput;
    }

    return input;
  }

  private _createServices(recipeId: string, executorId: string): Services {
    const txSender = new TxSender(
      recipeId,
      executorId,
      this._providers.gasProvider,
      this._journal
    );

    const services: Services = {
      artifacts: new ArtifactsService(this._providers),
      contracts: new ContractsService(this._providers, txSender, {
        pollingInterval: this._options.txPollingInterval,
      }),
      transactions: new TransactionsService(this._providers),
      config: new ConfigService(this._providers),
    };

    return services;
  }
}

export type DeploymentResult =
  | { _kind: "failure"; failures: [string, Error[]] }
  | { _kind: "hold"; holds: [string, string[]] }
  | { _kind: "success"; result: SerializedDeploymentResult };

export class ExecutionManager {
  private _debug = setupDebug("ignition:execution-manager");
  constructor(
    private _engine: ExecutionEngine,
    private _tickInterval: number
  ) {}

  public async execute(
    executionGraph: ExecutionGraph
  ): Promise<DeploymentResult> {
    const executionGenerator = this._engine.execute(executionGraph);

    while (true) {
      this._debug("Run next execution iteration");
      const deploymentResultIteration = await executionGenerator.next();

      if (deploymentResultIteration.value !== undefined) {
        const deploymentState = deploymentResultIteration.value;

        const failures = deploymentState.getFailures();
        if (failures !== undefined && failures.length > 0) {
          return {
            _kind: "failure",
            failures,
          };
        }

        const holds = deploymentState.getHolds();
        if (holds !== undefined && holds.length > 0) {
          return {
            _kind: "hold",
            holds,
          };
        }

        const serializedDeploymentResult: SerializedDeploymentResult = {};

        for (const recipeState of deploymentState.getRecipes()) {
          serializedDeploymentResult[recipeState.id] =
            recipeState.toRecipeResult();
        }

        return {
          _kind: "success",
          result: serializedDeploymentResult,
        };
      }

      await sleep(this._tickInterval);
    }
  }
}
