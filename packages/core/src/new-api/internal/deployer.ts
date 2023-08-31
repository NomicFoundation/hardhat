import type { IgnitionModule } from "../types/module";

import { IgnitionError } from "../../errors";
import { isContractFuture } from "../type-guards";
import { ArtifactResolver } from "../types/artifact";
import {
  DeployConfig,
  DeploymentParameters,
  DeploymentResult,
  DeploymentResultContracts,
} from "../types/deployer";
import {
  ExecutionEventListener,
  ExecutionEventType,
} from "../types/execution-events";

import { Batcher } from "./batcher";
import { DeploymentLoader } from "./deployment-loader/types";
import {
  initializeDeploymentState,
  loadDeploymentState,
} from "./new-execution/deployment-state-helpers";
import { ExecutionEngine } from "./new-execution/execution-engine";
import { JsonRpcClient } from "./new-execution/jsonrpc-client";
import { DeploymentState } from "./new-execution/types/deployment-state";
import {
  ContractAtExecutionState,
  DeploymentExecutionState,
  ExecutionSateType,
  ExecutionState,
  ExecutionStatus,
} from "./new-execution/types/execution-state";
import { ExecutionStrategy } from "./new-execution/types/execution-strategy";
import { findDeployedContracts } from "./new-execution/views/find-deployed-contracts";
import { Reconciler } from "./reconciliation/reconciler";
import { assertIgnitionInvariant } from "./utils/assertions";
import { getFuturesFromModule } from "./utils/get-futures-from-module";
import { validateStageTwo } from "./validation/validateStageTwo";

/**
 * Run an Igntition deployment.
 *
 * @beta
 */
export class Deployer {
  constructor(
    private readonly _config: DeployConfig,
    private readonly _executionStrategy: ExecutionStrategy,
    private readonly _jsonRpcClient: JsonRpcClient,
    private readonly _artifactResolver: ArtifactResolver,
    private readonly _deploymentLoader: DeploymentLoader,
    private readonly _executionEventListener?: ExecutionEventListener
  ) {
    assertIgnitionInvariant(
      this._config.requiredConfirmations >= 1,
      `Configured value 'requiredConfirmations' cannot be less than 1. Value given: '${this._config.requiredConfirmations}'`
    );
  }

  public async deploy(
    ignitionModule: IgnitionModule,
    deploymentParameters: DeploymentParameters,
    accounts: string[],
    defaultSender: string
  ): Promise<DeploymentResult> {
    await validateStageTwo(
      ignitionModule,
      this._artifactResolver,
      deploymentParameters,
      accounts
    );

    let deploymentState = await this._getOrInitializeDeploymentState(
      ignitionModule.id
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
          exState
        ): exState is DeploymentExecutionState | ContractAtExecutionState =>
          exState.type === ExecutionSateType.DEPLOYMENT_EXECUTION_STATE ||
          exState.type === ExecutionSateType.CONTRACT_AT_EXECUTION_STATE
      ),
      "Invalid state map"
    );

    const reconciliationResult = await Reconciler.reconcile(
      ignitionModule,
      deploymentState,
      deploymentParameters,
      accounts,
      this._deploymentLoader,
      this._artifactResolver,
      defaultSender
    );

    if (reconciliationResult.reconciliationFailures.length > 0) {
      const failures = reconciliationResult.reconciliationFailures
        .map((rf) => `  ${rf.futureId} - ${rf.failure}`)
        .join("\n");

      throw new IgnitionError(`Reconciliation failed\n\n${failures}`);
    }

    if (reconciliationResult.missingExecutedFutures.length > 0) {
      // TODO: indicate to UI that warnings should be shown
    }

    const batches = Batcher.batch(ignitionModule, deploymentState);

    this._emitDeploymentBatchEvent(batches);

    const executionEngine = new ExecutionEngine(
      this._deploymentLoader,
      this._artifactResolver,
      this._executionStrategy,
      this._jsonRpcClient,
      this._executionEventListener,
      this._config.requiredConfirmations,
      this._config.timeBeforeBumpingFees,
      this._config.maxFeeBumps,
      this._config.blockPollingInterval
    );

    deploymentState = await executionEngine.executeModule(
      deploymentState,
      ignitionModule,
      batches,
      accounts,
      deploymentParameters,
      defaultSender
    );

    return this._getDeploymentResult(
      deploymentState,
      this._deploymentLoader,
      ignitionModule
    );
  }

  private async _getDeploymentResult(
    deploymentState: DeploymentState,
    deploymentLoader: DeploymentLoader,
    module: IgnitionModule
  ): Promise<DeploymentResult> {
    if (
      Object.values(deploymentState.executionStates).some(
        (ex) => ex.status !== ExecutionStatus.SUCCESS
      )
    ) {
      // TODO: deal with failure cases and error cases
      throw new Error("TBD");
    }

    const deployedContracts: DeploymentResultContracts = {};

    for (const {
      futureId,
      contractName,
      contractAddress,
    } of findDeployedContracts(deploymentState)) {
      const artifact = await deploymentLoader.loadArtifact(futureId);

      deployedContracts[futureId] = {
        contractName,
        contractAddress,
        artifact,
      };
    }

    return {
      status: "success",
      contracts: deployedContracts,
      module,
    };
  }

  private async _getOrInitializeDeploymentState(
    moduleId: string
  ): Promise<DeploymentState> {
    const chainId = await this._jsonRpcClient.getChainId();
    const deploymentState = await loadDeploymentState(this._deploymentLoader);

    if (deploymentState === undefined) {
      this._emitDeploymentStartEvent(moduleId);

      return initializeDeploymentState(chainId, this._deploymentLoader);
    }

    assertIgnitionInvariant(
      deploymentState.chainId === chainId,
      `Trying to continue deployment in a different chain. Previous chain id: ${deploymentState.chainId}. Current chain id: ${chainId}`
    );

    return deploymentState;
  }

  private _emitDeploymentBatchEvent(batches: string[][]): void {
    if (this._executionEventListener !== undefined) {
      this._executionEventListener.BATCH_INITIALIZE({
        type: ExecutionEventType.BATCH_INITIALIZE,
        batches,
      });
    }
  }

  private _emitDeploymentStartEvent(moduleId: string): void {
    if (this._executionEventListener !== undefined) {
      this._executionEventListener.DEPLOYMENT_START({
        type: ExecutionEventType.DEPLOYMENT_START,
        moduleName: moduleId,
      });
    }
  }
}
