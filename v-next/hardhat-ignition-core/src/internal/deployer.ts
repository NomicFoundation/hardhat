import type { DeploymentLoader } from "./deployment-loader/types.js";
import type { JsonRpcClient } from "./execution/jsonrpc-client.js";
import type { ArtifactResolver } from "../types/artifact.js";
import type {
  DeployConfig,
  DeploymentParameters,
  DeploymentResult,
  ExecutionErrorDeploymentResult,
  PreviousRunErrorDeploymentResult,
  ReconciliationErrorDeploymentResult,
} from "../types/deploy.js";
import type { ExecutionEventListener } from "../types/execution-events.js";
import type { IgnitionModule, IgnitionModuleResult } from "../types/module.js";
import type { DeploymentState } from "./execution/types/deployment-state.js";
import type {
  ContractAtExecutionState,
  DeploymentExecutionState,
  ExecutionState,
} from "./execution/types/execution-state.js";
import type { ExecutionStrategy } from "./execution/types/execution-strategy.js";

import { HardhatError } from "@nomicfoundation/hardhat-errors";

import { isContractFuture } from "../type-guards.js";
import { DeploymentResultType } from "../types/deploy.js";
import { ExecutionEventType } from "../types/execution-events.js";

import { Batcher } from "./batcher.js";
import {
  initializeDeploymentState,
  loadDeploymentState,
} from "./execution/deployment-state-helpers.js";
import { ExecutionEngine } from "./execution/execution-engine.js";
import {
  ExecutionSateType,
  ExecutionStatus,
} from "./execution/types/execution-state.js";
import { Reconciler } from "./reconciliation/reconciler.js";
import { assertIgnitionInvariant } from "./utils/assertions.js";
import { getFuturesFromModule } from "./utils/get-futures-from-module.js";
import { findDeployedContracts } from "./views/find-deployed-contracts.js";
import { findStatus } from "./views/find-status.js";

/**
 * Run an Igntition deployment.
 */
export class Deployer {
  constructor(
    private readonly _config: DeployConfig,
    private readonly _deploymentDir: string | undefined,
    private readonly _executionStrategy: ExecutionStrategy,
    private readonly _jsonRpcClient: JsonRpcClient,
    private readonly _artifactResolver: ArtifactResolver,
    private readonly _deploymentLoader: DeploymentLoader,
    private readonly _executionEventListener?:
      | ExecutionEventListener
      | undefined,
  ) {
    assertIgnitionInvariant(
      this._config.requiredConfirmations >= 1,
      `Configured value 'requiredConfirmations' cannot be less than 1. Value given: '${this._config.requiredConfirmations}'`,
    );
  }

  public async deploy<
    ModuleIdT extends string,
    ContractNameT extends string,
    IgnitionModuleResultsT extends IgnitionModuleResult<ContractNameT>,
  >(
    ignitionModule: IgnitionModule<
      ModuleIdT,
      ContractNameT,
      IgnitionModuleResultsT
    >,
    deploymentParameters: DeploymentParameters,
    accounts: string[],
    defaultSender: string,
  ): Promise<DeploymentResult> {
    const deployment = await this._getOrInitializeDeploymentState();

    const isResumed = deployment.isResumed;
    let deploymentState = deployment.deploymentState;

    this._emitDeploymentStartEvent(
      ignitionModule.id,
      this._deploymentDir,
      isResumed,
      this._config.maxFeeBumps,
      this._config.disableFeeBumping,
    );

    const contracts =
      getFuturesFromModule(ignitionModule).filter(isContractFuture);

    const contractStates = contracts
      .map((contract) => deploymentState?.executionStates[contract.id])
      .filter((v): v is ExecutionState => v !== undefined);

    // realistically this should be impossible to fail.
    // just need it here for the type inference
    assertIgnitionInvariant(
      contractStates.every(
        (
          exState,
        ): exState is DeploymentExecutionState | ContractAtExecutionState =>
          exState.type === ExecutionSateType.DEPLOYMENT_EXECUTION_STATE ||
          exState.type === ExecutionSateType.CONTRACT_AT_EXECUTION_STATE,
      ),
      "Invalid state map",
    );

    const reconciliationResult = await Reconciler.reconcile(
      ignitionModule,
      deploymentState,
      deploymentParameters,
      accounts,
      this._deploymentLoader,
      this._artifactResolver,
      defaultSender,
      this._executionStrategy.name,
      this._executionStrategy.config,
    );

    if (reconciliationResult.reconciliationFailures.length > 0) {
      const errors: ReconciliationErrorDeploymentResult["errors"] = {};

      for (const {
        futureId,
        failure,
      } of reconciliationResult.reconciliationFailures) {
        if (errors[futureId] === undefined) {
          errors[futureId] = [];
        }

        errors[futureId].push(failure);
      }

      const reconciliationErrorResult: ReconciliationErrorDeploymentResult = {
        type: DeploymentResultType.RECONCILIATION_ERROR,
        errors,
      };

      this._emitDeploymentCompleteEvent(reconciliationErrorResult);

      return reconciliationErrorResult;
    }

    const previousRunErrors =
      Reconciler.checkForPreviousRunErrors(deploymentState);

    if (previousRunErrors.length > 0) {
      const errors: PreviousRunErrorDeploymentResult["errors"] = {};

      for (const { futureId, failure } of previousRunErrors) {
        if (errors[futureId] === undefined) {
          errors[futureId] = [];
        }

        errors[futureId].push(failure);
      }

      const previousRunErrorResult: PreviousRunErrorDeploymentResult = {
        type: DeploymentResultType.PREVIOUS_RUN_ERROR,
        errors,
      };

      this._emitDeploymentCompleteEvent(previousRunErrorResult);

      return previousRunErrorResult;
    }

    if (reconciliationResult.missingExecutedFutures.length > 0) {
      this._emitReconciliationWarningsEvent(
        reconciliationResult.missingExecutedFutures,
      );
    }

    const batches = Batcher.batch(ignitionModule, deploymentState);

    this._emitDeploymentBatchEvent(batches);

    if (this._hasBatchesToExecute(batches)) {
      this._emitRunStartEvent();

      const executionEngine = new ExecutionEngine(
        this._deploymentLoader,
        this._artifactResolver,
        this._executionStrategy,
        this._jsonRpcClient,
        this._executionEventListener,
        this._config.requiredConfirmations,
        this._config.timeBeforeBumpingFees,
        this._config.maxFeeBumps,
        this._config.blockPollingInterval,
        this._config.disableFeeBumping,
        this._config.maxRetries,
        this._config.retryInterval,
      );

      deploymentState = await executionEngine.executeModule(
        deploymentState,
        ignitionModule,
        batches,
        accounts,
        deploymentParameters,
        defaultSender,
      );
    }

    const result = await this._getDeploymentResult(
      deploymentState,
      ignitionModule,
    );

    this._emitDeploymentCompleteEvent(result);

    return result;
  }

  private async _getDeploymentResult<
    ModuleIdT extends string,
    ContractNameT extends string,
    IgnitionModuleResultsT extends IgnitionModuleResult<ContractNameT>,
  >(
    deploymentState: DeploymentState,
    _module: IgnitionModule<ModuleIdT, ContractNameT, IgnitionModuleResultsT>,
  ): Promise<DeploymentResult> {
    if (!this._isSuccessful(deploymentState)) {
      return this._getExecutionErrorResult(deploymentState);
    }

    const deployedContracts = findDeployedContracts(deploymentState);

    return {
      type: DeploymentResultType.SUCCESSFUL_DEPLOYMENT,
      contracts: deployedContracts,
    };
  }

  /**
   * Fetches the existing deployment state or initializes a new one.
   *
   * @returns An object with the deployment state and a boolean indicating
   * if the deployment is being resumed (i.e. the deployment state is not
   * new).
   */
  private async _getOrInitializeDeploymentState(): Promise<{
    deploymentState: DeploymentState;
    isResumed: boolean;
  }> {
    const chainId = await this._jsonRpcClient.getChainId();
    const deploymentState = await loadDeploymentState(this._deploymentLoader);

    if (deploymentState === undefined) {
      const newState = await initializeDeploymentState(
        chainId,
        this._deploymentLoader,
      );

      return { deploymentState: newState, isResumed: false };
    }

    // TODO: this should be moved out, it is not obvious that a significant
    // check is being done in an init method
    if (deploymentState.chainId !== chainId) {
      throw new HardhatError(
        HardhatError.ERRORS.IGNITION.DEPLOY.CHANGED_CHAINID,
        {
          previousChainId: deploymentState.chainId,
          currentChainId: chainId,
        },
      );
    }

    return { deploymentState, isResumed: true };
  }

  private _emitDeploymentStartEvent(
    moduleId: string,
    deploymentDir: string | undefined,
    isResumed: boolean,
    maxFeeBumps: number,
    disableFeeBumping: boolean,
  ): void {
    if (this._executionEventListener === undefined) {
      return;
    }

    this._executionEventListener.deploymentStart({
      type: ExecutionEventType.DEPLOYMENT_START,
      moduleName: moduleId,
      deploymentDir: deploymentDir ?? undefined,
      isResumed,
      maxFeeBumps,
      disableFeeBumping,
    });
  }

  private _emitReconciliationWarningsEvent(warnings: string[]): void {
    if (this._executionEventListener === undefined) {
      return;
    }

    this._executionEventListener.reconciliationWarnings({
      type: ExecutionEventType.RECONCILIATION_WARNINGS,
      warnings,
    });
  }

  private _emitDeploymentBatchEvent(batches: string[][]): void {
    if (this._executionEventListener === undefined) {
      return;
    }

    this._executionEventListener.batchInitialize({
      type: ExecutionEventType.BATCH_INITIALIZE,
      batches,
    });
  }

  private _emitRunStartEvent(): void {
    if (this._executionEventListener === undefined) {
      return;
    }

    this._executionEventListener.runStart({
      type: ExecutionEventType.RUN_START,
    });
  }

  private _emitDeploymentCompleteEvent(result: DeploymentResult): void {
    if (this._executionEventListener === undefined) {
      return;
    }

    this._executionEventListener.deploymentComplete({
      type: ExecutionEventType.DEPLOYMENT_COMPLETE,
      result,
    });
  }

  private _isSuccessful(deploymentState: DeploymentState): boolean {
    return Object.values(deploymentState.executionStates).every(
      (ex) => ex.status === ExecutionStatus.SUCCESS,
    );
  }

  private _getExecutionErrorResult(
    deploymentState: DeploymentState,
  ): ExecutionErrorDeploymentResult {
    const status = findStatus(deploymentState);

    return {
      type: DeploymentResultType.EXECUTION_ERROR,
      ...status,
    };
  }

  /**
   * Determine if an execution run is necessary.
   *
   * @param batches - the batches to be executed
   * @returns if there are batches to be executed
   */
  private _hasBatchesToExecute(batches: string[][]) {
    return batches.length > 0;
  }
}
