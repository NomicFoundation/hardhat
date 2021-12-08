import debug from "debug";

import {
  AddressLike,
  BindingOutput,
  ContractBinding,
  ContractOptions,
  InternalBinding,
  InternalContractBinding,
  SerializedDeploymentResult,
  SerializedModuleResult,
} from "./bindings";
import { BindingState, ModuleState } from "./deployment-state";
import {
  DeploymentPlan,
  DeploymentResult,
  ExecutionEngine,
  ExecutionManager,
  GetModuleResult,
  SaveModuleResult,
} from "./execution-engine";
import { Executor, Hold } from "./executors";
import { FileJournal, InMemoryJournal } from "./journal";
import { ModuleBuilder, ModuleBuilderImpl, UserModule } from "./modules";
import { Providers } from "./providers";
import { Services } from "./services";
import { Contract } from "./types";

export { Binding } from "./bindings";
export { DeploymentPlan } from "./execution-engine";
export { buildModule } from "./modules";
export {
  AddressLike,
  BindingOutput,
  BindingState,
  Contract,
  ContractBinding,
  ContractOptions,
  DeploymentResult,
  Executor,
  Hold,
  InternalBinding,
  InternalContractBinding,
  ModuleBuilder,
  ModuleState,
  Providers,
  Services,
  UserModule,
  SerializedModuleResult,
  SerializedDeploymentResult,
};

const log = debug("ignition:main");

export interface IgnitionDeployOptions {
  getModuleResult: GetModuleResult;
  saveModuleResult: SaveModuleResult;
  pathToJournal: string | undefined;
  txPollingInterval: number;
}

export class Ignition {
  constructor(private _providers: Providers) {}

  public async deploy(
    userModules: Array<UserModule<any>>,
    {
      getModuleResult,
      saveModuleResult,
      pathToJournal,
      txPollingInterval,
    }: IgnitionDeployOptions
  ) {
    log(`Start deploy, '${userModules.length}' modules`);

    const m = new ModuleBuilderImpl();

    const moduleOutputs: Record<string, any> = {};

    for (const userModule of userModules) {
      log("Load module '%s'", userModule.id);
      const moduleOutput = m.useModule(userModule) ?? {};
      moduleOutputs[userModule.id] = moduleOutput;
    }

    log("Build execution graph");
    const executionGraph = m.buildExecutionGraph();

    log("Create journal with path '%s'", pathToJournal);
    const journal =
      pathToJournal !== undefined
        ? new FileJournal(pathToJournal)
        : new InMemoryJournal();

    const engine = new ExecutionEngine(this._providers, journal, {
      parallelizationLevel: 2,
      loggingEnabled: pathToJournal !== undefined,
      txPollingInterval,
      getModuleResult,
      saveModuleResult,
    });

    const executionManager = new ExecutionManager(
      engine,
      txPollingInterval / 5
    );

    log("Execute deployment");
    const deploymentResult = await executionManager.execute(executionGraph);

    return [deploymentResult, moduleOutputs] as const;
  }

  public async buildPlan(
    userModules: Array<UserModule<any>>,
    { getModuleResult }: { getModuleResult: GetModuleResult }
  ): Promise<DeploymentPlan> {
    log(`Start building plan, '${userModules.length}' modules`);

    const m = new ModuleBuilderImpl();

    const moduleOutputs: any[] = [];

    for (const userModule of userModules) {
      log("Load module '%s'", userModule.id);
      const moduleOutput = m.useModule(userModule);
      moduleOutputs.push(moduleOutput);
    }

    log("Build ExecutionGraph");
    const executionGraph = m.buildExecutionGraph();

    return ExecutionEngine.buildPlan(executionGraph, { getModuleResult });
  }
}
