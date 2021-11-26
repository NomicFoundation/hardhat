import debug from "debug";

import { InternalBinding } from "./bindings";
import { DeploymentState } from "./deployment-state";
import { Journal } from "./journal";
import { DAG, IgnitionModule } from "./modules";
import { Providers } from "./providers";
import {
  ArtifactsService,
  ContractsService,
  UiService,
  Services,
  TransactionsService,
  ExecutorUiService,
} from "./services";
import { TxSender } from "./tx-sender";
import { sleep } from "./utils";

interface ExecutionEngineOptions {
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
  private _debug = debug("ignition:execution-engine");

  public static buildPlan(
    dag: DAG,
    currentDeploymentResult: DeploymentState
  ): DeploymentPlan {
    const plan: DeploymentPlan = {};

    const ignitionModules = dag.getSortedModules();

    for (const ignitionModule of ignitionModules) {
      if (currentDeploymentResult.hasModule(ignitionModule.id)) {
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
    private _options: ExecutionEngineOptions
  ) {}

  public async *execute(dag: DAG, previousDeploymentState: DeploymentState) {
    const deploymentState = DeploymentState.clone(previousDeploymentState);

    const ids: Record<string, string[]> = {};
    const modules = dag.getSortedModules();
    modules.forEach((module) => {
      ids[module.id] = module.getSortedExecutors().map((e) => e.binding.id);
    });

    const uiService = new UiService({
      enabled: this._options.loggingEnabled,
      deploymentState,
    });

    // validate all modules
    const errorsPerModule: Map<string, string[]> = new Map();
    let hasErrors = false;
    for (const ignitionModule of dag.getSortedModules()) {
      this._debug(`Validating module ${ignitionModule.id}`);
      const errors = await this._validateModule(ignitionModule, uiService);
      if (errors.length > 0) {
        hasErrors = true;
      }
      errorsPerModule.set(ignitionModule.id, errors);
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
    for (const ignitionModule of dag.getSortedModules()) {
      this._debug(`Begin execution of module ${ignitionModule.id}`);

      if (deploymentState.isModuleSuccess(ignitionModule.id)) {
        this._debug(
          `The module ${ignitionModule.id} was already successfully deployed`
        );
        continue;
      }

      this._debug(`Executing module ${ignitionModule.id}`);
      const moduleExecutionGenerator = this._executeModule(
        ignitionModule,
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
    ignitionModule: IgnitionModule,
    uiService: UiService
  ): Promise<string[]> {
    const executors = ignitionModule.getSortedExecutors();
    const allErrors: string[] = [];

    for (const executor of executors) {
      this._debug(
        `Validating binding ${executor.binding.id} of module ${ignitionModule.id}`
      );
      const services = this._createServices(
        ignitionModule.id,
        executor.binding.id,
        uiService
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
        for (const executor of executors) {
          if (!moduleState.isBindingDone(executor.binding.id)) {
            if (executor.isSuccess()) {
              moduleState.setSuccess(executor.binding.id, executor.getResult());
            }
            if (executor.isHold()) {
              moduleState.setHold(
                executor.binding.id,
                executor.getHoldReason()
              );
            }
          }
        }

        const failures = executors
          .filter((e) => e.isFailure())
          .map((e) => [e.binding.id, e.getError()]);

        const holds = executors
          .filter((e) => e.isHold())
          .map((e) => [e.binding.id, e.getHoldReason()]);

        if (failures.length === 0 && holds.length === 0) {
          await this._journal.delete(ignitionModule.id);
        }

        failures.forEach(([bindingId, failure]) =>
          moduleState.addFailure(bindingId, failure)
        );
        holds.forEach(([bindingId, holdReason]) =>
          moduleState.setHold(bindingId, holdReason)
        );

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
              executor.binding.id,
              uiService
            );

            this._debug(`Start ${ignitionModule.id}/${executor.binding.id}`);
            moduleState.setRunning(executor.binding.id);
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            executor.run(resolvedInput, services);
            runningCount++;
          }
        }

        if (!moduleState.isBindingDone(executor.binding.id)) {
          this._debug(
            `Check result of ${ignitionModule.id}/${executor.binding.id}`
          );
          if (executor.isSuccess()) {
            this._debug(
              `${ignitionModule.id}/${executor.binding.id} finished successfully`
            );
            moduleState.setSuccess(executor.binding.id, executor.getResult());
          }
          if (executor.isHold()) {
            this._debug(
              `${ignitionModule.id}/${executor.binding.id} is on hold`
            );
            moduleState.setHold(executor.binding.id, executor.getHoldReason());
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

  private _createServices(
    moduleId: string,
    executorId: string,
    uiService: UiService
  ): Services {
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
      ui: new ExecutorUiService(moduleId, executorId, uiService),
    };

    return services;
  }
}

export class ExecutionManager {
  private _debug = debug("ignition:execution-manager");
  constructor(
    private _engine: ExecutionEngine,
    private _tickInterval: number
  ) {}

  public async execute(
    dag: DAG,
    deploymentState: DeploymentState
  ): Promise<DeploymentState> {
    const executionGenerator = this._engine.execute(dag, deploymentState);

    while (true) {
      this._debug("Run next execution iteration");
      const deploymentResultIteration = await executionGenerator.next();

      if (deploymentResultIteration.value !== undefined) {
        return deploymentResultIteration.value;
      }

      await sleep(this._tickInterval);
    }
  }
}
