import debug from "debug";

import {
  AddressLike,
  BindingOutput,
  ContractBinding,
  ContractOptions,
  deserializeBindingOutput,
  InternalBinding,
  InternalContractBinding,
  serializeBindingOutput,
} from "./bindings";
import { DeploymentState } from "./deployment-state";
import { ExecutionEngine, ExecutionManager } from "./execution-engine";
import { Executor, Hold } from "./executors";
import { FileJournal, NullJournal } from "./journal";
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
  Contract,
  ContractBinding,
  ContractOptions,
  DeploymentState,
  Executor,
  Hold,
  InternalBinding,
  InternalContractBinding,
  ModuleBuilder,
  Providers,
  Services,
  UserModule,
  serializeBindingOutput,
  deserializeBindingOutput,
};

const log = debug("ignition:main");

export class Ignition {
  constructor(
    private _providers: Providers,
    private _saveDeployment: boolean
  ) {}

  public async deploy(
    userModules: Array<UserModule<any>>,
    currentDeploymentState: DeploymentState | undefined,
    {
      pathToJournal,
      txPollingInterval,
    }: { pathToJournal: string | undefined; txPollingInterval: number }
  ) {
    log(`Start deploy, '${userModules.length}' modules`);

    const m = new ModuleBuilderImpl();

    const moduleOutputs: any[] = [];

    for (const userModule of userModules) {
      log("Load module '%s'", userModule.id);
      const moduleOutput = m.useModule(userModule) ?? {};
      moduleOutputs.push(moduleOutput);
    }

    log("Build DAG");
    const dag = m.buildDAG();

    log("Create journal with path '%s'", pathToJournal);
    const journal =
      pathToJournal !== undefined
        ? new FileJournal(pathToJournal)
        : new NullJournal();

    const engine = new ExecutionEngine(this._providers, journal, {
      parallelizationLevel: 2,
      loggingEnabled: pathToJournal !== undefined,
      txPollingInterval,
    });

    const executionManager = new ExecutionManager(
      engine,
      txPollingInterval / 5
    );

    log("Execute deployment");
    const newDeploymentState = await executionManager.execute(
      dag,
      currentDeploymentState ?? new DeploymentState(dag)
    );

    return [newDeploymentState, moduleOutputs] as const;
  }

  public async buildPlan(
    userModules: Array<UserModule<any>>,
    currentDeploymentState: DeploymentState | undefined
  ) {
    log(`Start building plan, '${userModules.length}' modules`);

    const m = new ModuleBuilderImpl();

    const moduleOutputs: any[] = [];

    for (const userModule of userModules) {
      log("Load module '%s'", userModule.id);
      const moduleOutput = m.useModule(userModule);
      moduleOutputs.push(moduleOutput);
    }

    log("Build DAG");
    const dag = m.buildDAG();

    return ExecutionEngine.buildPlan(
      dag,
      currentDeploymentState ?? new DeploymentState(dag)
    );
  }
}
