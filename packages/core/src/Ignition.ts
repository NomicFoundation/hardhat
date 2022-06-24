import setupDebug from "debug";

import {
  DeploymentPlan,
  DeploymentResult,
  ExecutionEngine,
  ExecutionManager,
  IgnitionModulesResults,
} from "./execution-engine";
import { FileJournal } from "./journal/FileJournal";
import { InMemoryJournal } from "./journal/InMemoryJournal";
import { ModuleBuilderImpl } from "./modules/ModuleBuilderImpl";
import { UserModule } from "./modules/types";
import { Providers } from "./providers";

const log = setupDebug("ignition:main");

export interface IgnitionDeployOptions {
  pathToJournal: string | undefined;
  txPollingInterval: number;
}

type ModulesOutputs = Record<string, any>;

export class Ignition {
  constructor(
    private _providers: Providers,
    private _modulesResults: IgnitionModulesResults
  ) {}

  public async deploy(
    userModules: Array<UserModule<any>>,
    { pathToJournal, txPollingInterval }: IgnitionDeployOptions
  ): Promise<[DeploymentResult, ModulesOutputs]> {
    log(`Start deploy, '${userModules.length}' modules`);

    const m = new ModuleBuilderImpl();

    const modulesOutputs: ModulesOutputs = {};

    for (const userModule of userModules) {
      log("Load module '%s'", userModule.id);
      const moduleOutput = m.useModule(userModule) ?? {};
      modulesOutputs[userModule.id] = moduleOutput;
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
      this._modulesResults,
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

    return [deploymentResult, modulesOutputs];
  }

  public async buildPlan(
    userModules: Array<UserModule<any>>
  ): Promise<DeploymentPlan> {
    log(`Start building plan, '${userModules.length}' modules`);

    const m = new ModuleBuilderImpl();

    for (const userModule of userModules) {
      log("Load module '%s'", userModule.id);
      m.useModule(userModule);
    }

    log("Build ExecutionGraph");
    const executionGraph = m.buildExecutionGraph();

    return ExecutionEngine.buildPlan(executionGraph, this._modulesResults);
  }
}
