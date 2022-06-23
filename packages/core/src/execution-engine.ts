import setupDebug from "debug";

import {
  deserializeBindingOutput,
  InternalBinding,
  ModuleResult,
  SerializedDeploymentResult,
  SerializedModuleResult,
} from "./bindings/types";
import { DeploymentState } from "./deployment-state";
import { Journal } from "./journal/types";
import { ExecutionGraph } from "./modules/ExecutionGraph";
import { IgnitionModule } from "./modules/IgnitionModule";
import { Providers } from "./providers";
import { ArtifactsService } from "./services/ArtifactsService";
import { ContractsService } from "./services/ContractsService";
import { TransactionsService } from "./services/TransactionsService";
import type { Services } from "./services/types";
import { TxSender } from "./tx-sender";
import { UiService } from "./ui/ui-service";
import { sleep } from "./utils";

export interface IgnitionModulesResults {
  load: (moduleId: string) => Promise<SerializedModuleResult | undefined>;
  save: (
    moduleId: string,
    moduleResult: SerializedModuleResult
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
type ModulePlan = "already-deployed" | ExecutorPlan[];
export type DeploymentPlan = Record<string, ModulePlan>;

export class ExecutionEngine {
  private _debug = setupDebug("ignition:execution-engine");

  public static async buildPlan(
    executionGraph: ExecutionGraph,
    modulesResults: IgnitionModulesResults
  ): Promise<DeploymentPlan> {
    const plan: DeploymentPlan = {};

    const ignitionModules = executionGraph.getSortedModules();

    for (const ignitionModule of ignitionModules) {
      const moduleResult = await modulesResults.load(ignitionModule.id);
      if (moduleResult !== undefined) {
        plan[ignitionModule.id] = "already-deployed";
        continue;
      }

      const modulePlan: ExecutorPlan[] = [];
      const executors = ignitionModule.getSortedExecutors();
      for (const executor of executors) {
        modulePlan.push({
          id: executor.binding.id,
          description: executor.getDescription(),
        });
      }
      plan[ignitionModule.id] = modulePlan;
    }

    return plan;
  }

  constructor(
    private _providers: Providers,
    private _journal: Journal,
    private _modulesResults: IgnitionModulesResults,
    private _options: ExecutionEngineOptions
  ) {}

  public async *execute(executionGraph: ExecutionGraph) {
    const deploymentState = DeploymentState.fromExecutionGraph(executionGraph);

    const executionModules = executionGraph.getSortedModules();

    const uiService = new UiService({
      enabled: this._options.loggingEnabled,
      deploymentState,
    });

    // validate all modules
    const errorsPerModule: Map<string, string[]> = new Map();
    let hasErrors = false;
    for (const executionModule of executionModules) {
      this._debug(`Validating module ${executionModule.id}`);
      const errors = await this._validateModule(executionModule);
      if (errors.length > 0) {
        hasErrors = true;
      }
      errorsPerModule.set(executionModule.id, errors);
    }

    if (hasErrors) {
      let errorMessage = `The following validation errors were found:\n`;
      let isFirst = true;
      for (const [moduleId, errors] of errorsPerModule.entries()) {
        if (errors.length === 0) {
          continue;
        }
        if (!isFirst) {
          errorMessage += "\n";
        }
        isFirst = false;

        errorMessage += `  In module ${moduleId}:\n`;
        for (const error of errors) {
          errorMessage += `    - ${error}\n`;
        }
      }

      throw new Error(errorMessage);
    }

    // execute each module sequentially
    for (const executionModule of executionModules) {
      const serializedModuleResult = await this._modulesResults.load(
        executionModule.id
      );

      if (serializedModuleResult !== undefined) {
        const moduleResult: ModuleResult = Object.fromEntries(
          Object.entries(serializedModuleResult).map(([key, value]) => [
            key,
            deserializeBindingOutput(value),
          ])
        );

        deploymentState.addModuleResult(executionModule.id, moduleResult);

        continue;
      }

      this._debug(`Begin execution of module ${executionModule.id}`);

      if (deploymentState.isModuleSuccess(executionModule.id)) {
        this._debug(
          `The module ${executionModule.id} was already successfully deployed`
        );
        continue;
      }

      this._debug(`Executing module ${executionModule.id}`);
      const moduleExecutionGenerator = this._executeModule(
        executionModule,
        deploymentState,
        uiService
      );
      for await (const moduleResult of moduleExecutionGenerator) {
        if (moduleResult !== undefined) {
          break;
        }
        yield;
      }
    }

    yield deploymentState;
  }

  private async _validateModule(
    ignitionModule: IgnitionModule
  ): Promise<string[]> {
    const executors = ignitionModule.getSortedExecutors();
    const allErrors: string[] = [];

    for (const executor of executors) {
      this._debug(
        `Validating binding ${executor.binding.id} of module ${ignitionModule.id}`
      );
      const services = this._createServices(
        ignitionModule.id,
        executor.binding.id
      );

      const errors = await executor.validate(executor.binding.input, services);
      if (errors.length > 0) {
        allErrors.push(...errors);
      }
    }

    return allErrors;
  }

  private async *_executeModule(
    ignitionModule: IgnitionModule,
    deploymentState: DeploymentState,
    uiService: UiService
  ) {
    const { parallelizationLevel } = this._options;
    const executors = ignitionModule.getSortedExecutors();
    const moduleState = deploymentState.getModule(ignitionModule.id);

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
        if (moduleState.isSuccess()) {
          const moduleResult = moduleState.toModuleResult();
          await this._modulesResults.save(ignitionModule.id, moduleResult);
          await this._journal.delete(ignitionModule.id);
        }

        yield moduleState;
      }

      for (const executor of ignitionModule.getSortedExecutors()) {
        this._debug(`Check ${ignitionModule.id}/${executor.binding.id}`);

        if (executor.isReady() && runningCount < parallelizationLevel) {
          this._debug(
            `Check dependencies of ${ignitionModule.id}/${executor.binding.id}`
          );
          const dependencies = executor.binding.getDependencies();
          const allDependenciesReady = dependencies.every((d) =>
            deploymentState.isBindingSuccess(d.moduleId, d.id)
          );

          if (allDependenciesReady) {
            const resolvedInput = this._resolve(
              executor.binding.input,
              deploymentState
            );
            const services = this._createServices(
              ignitionModule.id,
              executor.binding.id
            );

            this._debug(`Start ${ignitionModule.id}/${executor.binding.id}`);

            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            executor.run(resolvedInput, services, (newState) => {
              deploymentState.setBindingState(
                ignitionModule.id,
                executor.binding.id,
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
    if (InternalBinding.isBinding(input)) {
      return deploymentResult.getBindingResult(input.moduleId, input.id);
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

  private _createServices(moduleId: string, executorId: string): Services {
    const txSender = new TxSender(
      moduleId,
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

        for (const moduleState of deploymentState.getModules()) {
          serializedDeploymentResult[moduleState.id] =
            moduleState.toModuleResult();
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
