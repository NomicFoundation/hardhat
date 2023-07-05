import type {
  ContractFuture,
  IgnitionModuleResult,
  ModuleParameters,
} from "../types/module";
import type { IgnitionModuleDefinition } from "../types/module-builder";

import { isContractFuture } from "../type-guards";
import { Artifact, ArtifactResolver } from "../types/artifact";
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
import { ArtifactMap } from "./reconciliation/types";
import { isContractExecutionStateArray } from "./type-guards";
import { ExecutionStrategy } from "./types/execution-engine";
import {
  ContractAtExecutionState,
  DeploymentExecutionState,
  ExecutionStateMap,
} from "./types/execution-state";
import { assertIgnitionInvariant } from "./utils/assertions";
import { getFuturesFromModule } from "./utils/get-futures-from-module";
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
    deploymentLoader: DeploymentLoader;
    transactionService: TransactionService;
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

    const previousStateMap = await this._loadExecutionStateFrom(
      this._deploymentLoader.journal
    );

    const contracts = getFuturesFromModule(module).filter(isContractFuture);
    const contractStates = contracts.map(
      (contract) => previousStateMap[contract.id]
    );

    // realistically this should be impossible to fail.
    // just need it here for the type inference
    assertIgnitionInvariant(
      isContractExecutionStateArray(contractStates),
      "Invalid state map"
    );

    // since the reconciler is purely synchronous, we load all of the artifacts at once here.
    // if reconciler was async, we could pass it the artifact loaders and load them JIT instead.
    const moduleArtifactMap = await this._loadModuleArtifactMap(contracts);
    const storedArtifactMap = await this._loadStoredArtifactMap(contractStates);

    const reconciliationResult = Reconciler.reconcile(
      module,
      previousStateMap,
      deploymentParameters,
      accounts,
      moduleArtifactMap,
      storedArtifactMap
    );

    if (reconciliationResult.reconciliationFailures.length > 0) {
      // TODO: Provide more information
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

  private async _loadModuleArtifactMap(
    contracts: Array<ContractFuture<string>>
  ): Promise<ArtifactMap> {
    const entries: Array<[string, Artifact]> = [];

    for (const contract of contracts) {
      const artifact = await this._artifactResolver.loadArtifact(
        contract.contractName
      );

      entries.push([contract.id, artifact]);
    }

    return Object.fromEntries(entries);
  }

  private async _loadStoredArtifactMap(
    contractStates: Array<DeploymentExecutionState | ContractAtExecutionState>
  ): Promise<ArtifactMap> {
    const entries: Array<[string, Artifact]> = [];

    for (const contract of contractStates) {
      const artifact = await this._deploymentLoader.loadArtifact(
        contract.storedArtifactPath
      );

      entries.push([contract.id, artifact]);
    }

    return Object.fromEntries(entries);
  }
}
