import debug from "debug";

import { InternalBinding } from "./bindings";
import { TxSender } from "./tx-sender";
import { Journal } from "./journal";
import { DAG, IgnitionModule } from "./modules";
import { Providers } from "./providers";
import {
  ArtifactsService,
  ContractsService,
  LoggingService,
  Services,
  TransactionsService,
} from "./services";
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

  public static buildPlan(dag: DAG, currentDeploymentResult: DeploymentResult) {
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
    private _currentDeploymentResult: DeploymentResult,
    private _options: ExecutionEngineOptions
  ) {}

  public async *execute(dag: DAG) {
    const deploymentResult = this._currentDeploymentResult.clone();

    // validate all modules
    const errorsPerModule: Map<string, string[]> = new Map();
    let hasErrors = false;
    for (const ignitionModule of dag.getModules()) {
      this._debug(`Validating module ${ignitionModule.id}`);
      const errors = await this._validateModule(ignitionModule);
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
    for (const ignitionModule of dag.getModules()) {
      this._debug(`Begin execution of module ${ignitionModule.id}`);

      if (deploymentResult.hasModule(ignitionModule.id)) {
        this._debug(
          `A previous result for module ${ignitionModule.id} already exists`
        );
        const previousModuleResult = deploymentResult.getModule(
          ignitionModule.id
        );
        if (previousModuleResult.isSuccess()) {
          continue;
        }
      }

      this._debug(`Executing module ${ignitionModule.id}`);
      const moduleExecutionGenerator = this._executeModule(
        ignitionModule,
        deploymentResult
      );
      for await (const moduleResult of moduleExecutionGenerator) {
        if (moduleResult !== undefined) {
          deploymentResult.addResult(moduleResult);
          break;
        }
        yield;
      }
    }

    yield deploymentResult;
  }

  private async _validateModule(
    ignitionModule: IgnitionModule
  ): Promise<string[]> {
    const executors = ignitionModule.getExecutors();
    const allErrors: string[] = [];

    for (const executor of executors) {
      this._debug(
        `Validating binding ${executor.binding.id} of module ${ignitionModule.id}`
      );
      const txSender = new TxSender(
        ignitionModule.id,
        executor.binding.id,
        this._providers.gasProvider,
        this._journal
      );
      const services = createServices(
        this._providers,
        txSender,
        this._options.loggingEnabled,
        this._options.txPollingInterval
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
    deploymentResult: DeploymentResult
  ) {
    const { parallelizationLevel } = this._options;
    const executors = ignitionModule.getExecutors();
    const moduleResult = new ModuleResult(ignitionModule.id);

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
          if (!moduleResult.hasResult(executor.binding.id)) {
            if (executor.isSuccess()) {
              moduleResult.addResult(executor.binding.id, executor.getResult());
            }
            if (executor.isHold()) {
              moduleResult.addHold(
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
          moduleResult.addFailure(bindingId, failure)
        );
        holds.forEach(([bindingId, holdReason]) =>
          moduleResult.addHold(bindingId, holdReason)
        );

        yield moduleResult;
      }

      for (const executor of ignitionModule.getExecutors()) {
        this._debug(`Check ${ignitionModule.id}/${executor.binding.id}`);

        if (executor.isReady() && runningCount < parallelizationLevel) {
          this._debug(
            `Check dependencies of ${ignitionModule.id}/${executor.binding.id}`
          );
          const dependencies = executor.binding.getDependencies();
          const allDependenciesReady = dependencies.every((d) =>
            d.moduleId !== ignitionModule.id
              ? deploymentResult.hasBindingResult(d.moduleId, d.id)
              : moduleResult.hasResult(d.id)
          );

          if (allDependenciesReady) {
            const resolvedInput = this._resolve(
              executor.binding.input,
              deploymentResult,
              moduleResult
            );
            const txSender = new TxSender(
              ignitionModule.id,
              executor.binding.id,
              this._providers.gasProvider,
              this._journal
            );
            const services = createServices(
              this._providers,
              txSender,
              this._options.loggingEnabled,
              this._options.txPollingInterval
            );

            this._debug(`Start ${ignitionModule.id}/${executor.binding.id}`);
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            executor.run(resolvedInput, services);
            runningCount++;
          }
        }

        if (!moduleResult.hasResult(executor.binding.id)) {
          this._debug(
            `Check result of ${ignitionModule.id}/${executor.binding.id}`
          );
          if (executor.isSuccess()) {
            this._debug(
              `${ignitionModule.id}/${executor.binding.id} finished successfully`
            );
            moduleResult.addResult(executor.binding.id, executor.getResult());
          }
          if (executor.isHold()) {
            this._debug(
              `${ignitionModule.id}/${executor.binding.id} is on hold`
            );
            moduleResult.addHold(executor.binding.id, executor.getHoldReason());
          }
        }
      }

      yield;
    }
  }

  private _resolve(
    input: any,
    deploymentResult: DeploymentResult,
    currentModuleResult: ModuleResult
  ): any {
    if (InternalBinding.isBinding(input)) {
      if (input.moduleId === currentModuleResult.moduleId) {
        return currentModuleResult.getResult(input.id);
      } else {
        return deploymentResult.getBindingResult(input.moduleId, input.id);
      }
    }

    if (Array.isArray(input)) {
      return input.map((x) =>
        this._resolve(x, deploymentResult, currentModuleResult)
      );
    }

    if (typeof input === "object" && input !== null) {
      const resolvedInput: any = {};

      for (const [key, value] of Object.entries(input)) {
        resolvedInput[key] = this._resolve(
          value,
          deploymentResult,
          currentModuleResult
        );
      }

      return resolvedInput;
    }

    return input;
  }
}

export class DeploymentResult {
  private _results: Map<string, ModuleResult> = new Map();

  public getModule(moduleId: string): ModuleResult {
    const moduleResult = this._results.get(moduleId);
    if (moduleResult === undefined) {
      throw new Error(
        `DeploymentResult doesn't have module with id '${moduleId}'`
      );
    }

    return moduleResult;
  }

  public getModules(): ModuleResult[] {
    return [...this._results.values()];
  }

  public addResult(moduleResult: ModuleResult) {
    const moduleId = moduleResult.moduleId;
    if (this._results.has(moduleId)) {
      throw new Error(`A result for '${moduleId}' already exists`);
    }
    this._results.set(moduleId, moduleResult);
  }

  public hasModule(moduleId: string) {
    return this._results.has(moduleId);
  }

  public hasBindingResult(moduleId: string, bindingId: string) {
    const moduleResult = this._results.get(moduleId);
    if (moduleResult === undefined) {
      return false;
    }

    return moduleResult.hasResult(bindingId);
  }

  public getBindingResult(moduleId: string, bindingId: string) {
    const moduleResult = this._results.get(moduleId);
    if (moduleResult === undefined) {
      throw new Error(`No result for module '${moduleId}'`);
    }

    return moduleResult.getResult(bindingId);
  }

  public isHold(): [string, string[]] | undefined {
    for (const [moduleId, moduleResult] of this._results.entries()) {
      const holds = moduleResult.getHolds();
      if (holds.length > 0) {
        return [moduleId, holds];
      }
    }

    return;
  }

  public getFailures(): [string, Error[]] | undefined {
    for (const [moduleId, moduleResult] of this._results.entries()) {
      const failures = moduleResult.getFailures();
      if (failures.length > 0) {
        return [moduleId, failures];
      }

      // TODO assert that only one module has failures
    }

    return;
  }

  public clone(): DeploymentResult {
    const deploymentResult = new DeploymentResult();

    for (const ignitionModule of this.getModules()) {
      const moduleResult = new ModuleResult(ignitionModule.moduleId);
      for (const [resultId, result] of ignitionModule.getResults()) {
        moduleResult.addResult(resultId, result);
      }
      deploymentResult.addResult(moduleResult);
    }
    return deploymentResult;
  }
}

export class ModuleResult {
  // TODO merge these three into a single map
  private _results = new Map<string, any>();
  private _failures = new Map<string, Error>();
  private _holds = new Map<string, string>();

  private _generalFailures: Error[] = [];

  constructor(public readonly moduleId: string) {}

  public isSuccess(): boolean {
    const failuresCount = [
      ...this._failures.values(),
      ...this._generalFailures.values(),
    ].length;
    const holdsCount = [...this._holds.values()].length;

    return failuresCount + holdsCount === 0;
  }

  public isFailure(): boolean {
    const failuresCount = [
      ...this._failures.values(),
      ...this._generalFailures.values(),
    ].length;
    return failuresCount > 0;
  }

  public isHold(): boolean {
    const failuresCount = [
      ...this._failures.values(),
      ...this._generalFailures.values(),
    ].length;
    const holdsCount = [...this._holds.values()].length;

    return failuresCount === 0 && holdsCount > 0;
  }

  public hasResult(bindingId: string): boolean {
    return this._results.has(bindingId);
  }

  public addResult(bindingId: string, result: any) {
    const bindingResult = this._results.get(bindingId);
    if (bindingResult !== undefined) {
      throw new Error(
        `[ModuleResult] Module '${this.moduleId}' already has a result for binding '${bindingId}'`
      );
    }

    this._results.set(bindingId, result);
  }

  public addFailure(bindingId: string, error: Error) {
    this._failures.set(bindingId, error);
  }

  public addHold(bindingId: string, holdReason: string) {
    this._holds.set(bindingId, holdReason);
  }

  public addGeneralFailure(error: Error) {
    this._generalFailures.push(error);
  }

  public getResult(bindingId: string) {
    const bindingResult = this._results.get(bindingId);
    if (bindingResult === undefined) {
      throw new Error(
        `[ModuleResult] Module '${this.moduleId}' has no result for binding '${bindingId}'`
      );
    }

    return bindingResult;
  }

  public getResults(): Array<[string, any]> {
    return [...this._results.entries()];
  }

  public getHolds() {
    return [...this._holds.values()];
  }

  public getFailures(): Error[] {
    return [...this._failures.values(), ...this._generalFailures];
  }

  public count() {
    return [...this._results.values()].length;
  }
}

function createServices(
  providers: Providers,
  txSender: TxSender,
  loggingEnabled: boolean,
  txPollingInterval: number
): Services {
  const services: Services = {
    artifacts: new ArtifactsService(providers),
    contracts: new ContractsService(providers, txSender, {
      pollingInterval: txPollingInterval,
    }),
    transactions: new TransactionsService(providers),
    logging: new LoggingService({
      enabled: loggingEnabled,
    }),
  };

  return services;
}

export class ExecutionManager {
  constructor(
    private _engine: ExecutionEngine,
    private _tickInterval: number
  ) {}

  public async execute(dag: DAG): Promise<DeploymentResult> {
    const executionGenerator = this._engine.execute(dag);

    while (true) {
      const deploymentResultIteration = await executionGenerator.next();

      if (deploymentResultIteration.value !== undefined) {
        return deploymentResultIteration.value;
      }

      await sleep(this._tickInterval);
    }
  }
}
