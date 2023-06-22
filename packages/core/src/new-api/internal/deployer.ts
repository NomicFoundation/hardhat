import type { IgnitionModuleResult, ModuleParameters } from "../types/module";
import type { IgnitionModuleDefinition } from "../types/module-builder";

import { ArtifactResolver } from "../types/artifact";
import { DeploymentResult } from "../types/deployer";
import { DeploymentLoader } from "../types/deployment-loader";
import { Journal } from "../types/journal";
import { TransactionService } from "../types/transaction-service";

import { Batcher } from "./batcher";
import { ExecutionEngine } from "./execution/execution-engine";
import { BasicExecutionStrategy } from "./execution/execution-strategy";
import { executionStateReducer } from "./execution/executionStateReducer";
import { ModuleConstructor } from "./module-builder";
import { Reconciler } from "./reconciliation/reconciler";
import { ExecutionStrategy } from "./types/execution-engine";
import { ExecutionStateMap } from "./types/execution-state";
import { validate } from "./validation/validate";

/**
 * Run an Igntition deployment.
 *
 * @beta
 */
export class Deployer {
  private _moduleConstructor: ModuleConstructor;
  private _executionEngine: ExecutionEngine;
  private _transactionService: TransactionService;
  private _strategy: ExecutionStrategy;
  private _artifactResolver: ArtifactResolver;
  private _deploymentLoader: DeploymentLoader;

  constructor(options: {
    artifactResolver: ArtifactResolver;
    transactionService: TransactionService;
    deploymentLoader: DeploymentLoader;
  }) {
    this._strategy = new BasicExecutionStrategy();
    this._artifactResolver = options.artifactResolver;
    this._deploymentLoader = options.deploymentLoader;

    this._transactionService = options.transactionService;

    this._moduleConstructor = new ModuleConstructor();
    this._executionEngine = new ExecutionEngine();
  }

  public async deploy(
    moduleDefinition: IgnitionModuleDefinition<
      string,
      string,
      IgnitionModuleResult<string>
    >,
    deploymentParameters: { [key: string]: ModuleParameters },
    accounts: string[]
  ): Promise<DeploymentResult> {
    const module = this._moduleConstructor.construct(moduleDefinition);

    await validate(module, this._artifactResolver);

    await this._deploymentLoader.initialize();

    const previousStateMap = await this._loadExecutionStateFrom(
      this._deploymentLoader.journal
    );

    const reconciliationResult = Reconciler.reconcile(
      module,
      previousStateMap,
      deploymentParameters,
      accounts
    );

    if (reconciliationResult.reconciliationFailures.length > 0) {
      throw new Error("Reconciliation failed");
    }

    if (reconciliationResult.missingExecutedFutures.length > 0) {
      // TODO: indicate to UI that warnings should be shown
    }

    const batches = Batcher.batch(module, previousStateMap);

    return this._executionEngine.execute({
      strategy: this._strategy,
      transactionService: this._transactionService,
      artifactResolver: this._artifactResolver,
      batches,
      module,
      executionStateMap: previousStateMap,
      accounts,
      deploymentParameters,
      deploymentLoader: this._deploymentLoader,
    });
  }

  private async _loadExecutionStateFrom(
    journal: Journal
  ): Promise<ExecutionStateMap> {
    let state: ExecutionStateMap = {};

    for await (const message of journal.read()) {
      state = executionStateReducer(state, message);
    }

    return state;
  }
}
