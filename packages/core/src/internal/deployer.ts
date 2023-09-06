import type { IgnitionModule, IgnitionModuleResult } from "../types/module";

import { isContractFuture } from "../type-guards";
import { ArtifactResolver } from "../types/artifact";
import {
  DeployConfig,
  DeploymentParameters,
  DeploymentResult,
  DeploymentResultType,
  ExecutionErrorDeploymentResult,
  ReconciliationErrorDeploymentResult,
  SuccessfulDeploymentResult,
} from "../types/deploy";
import {
  ExecutionEventListener,
  ExecutionEventType,
} from "../types/execution-events";

import { Batcher } from "./batcher";
import { DeploymentLoader } from "./deployment-loader/types";
import { formatExecutionError } from "./formatters";
import {
  initializeDeploymentState,
  loadDeploymentState,
} from "./new-execution/deployment-state-helpers";
import { ExecutionEngine } from "./new-execution/execution-engine";
import { JsonRpcClient } from "./new-execution/jsonrpc-client";
import { DeploymentState } from "./new-execution/types/deployment-state";
import { ExecutionResultType } from "./new-execution/types/execution-result";
import {
  CallExecutionState,
  ContractAtExecutionState,
  DeploymentExecutionState,
  ExecutionSateType,
  ExecutionState,
  ExecutionStatus,
  SendDataExecutionState,
  StaticCallExecutionState,
} from "./new-execution/types/execution-state";
import { ExecutionStrategy } from "./new-execution/types/execution-strategy";
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

  public async deploy<
    ModuleIdT extends string,
    ContractNameT extends string,
    IgnitionModuleResultsT extends IgnitionModuleResult<ContractNameT>
  >(
    ignitionModule: IgnitionModule<
      ModuleIdT,
      ContractNameT,
      IgnitionModuleResultsT
    >,
    deploymentParameters: DeploymentParameters,
    accounts: string[],
    defaultSender: string
  ): Promise<DeploymentResult<ContractNameT, IgnitionModuleResultsT>> {
    const validationResult = await validateStageTwo(
      ignitionModule,
      this._artifactResolver,
      deploymentParameters,
      accounts
    );

    if (validationResult !== null) {
      this._emitDeploymentCompleteEvent(validationResult);

      return validationResult;
    }

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

    const result = await this._getDeploymentResult(
      deploymentState,
      ignitionModule
    );

    this._emitDeploymentCompleteEvent(result);

    return result;
  }

  private async _getDeploymentResult<
    ModuleIdT extends string,
    ContractNameT extends string,
    IgnitionModuleResultsT extends IgnitionModuleResult<ContractNameT>
  >(
    deploymentState: DeploymentState,
    module: IgnitionModule<ModuleIdT, ContractNameT, IgnitionModuleResultsT>
  ): Promise<DeploymentResult<ContractNameT, IgnitionModuleResultsT>> {
    if (!this._isSuccessful(deploymentState)) {
      return this._getExecutionErrorResult(deploymentState);
    }

    return {
      type: DeploymentResultType.SUCCESSFUL_DEPLOYMENT,
      contracts: Object.fromEntries(
        Object.entries(module.results).map(([name, contractFuture]) => [
          name,
          {
            id: contractFuture.id,
            contractName: contractFuture.contractName,
            address: getContractAddress(
              deploymentState.executionStates[contractFuture.id]
            ),
          },
        ])
      ) as SuccessfulDeploymentResult<
        ContractNameT,
        IgnitionModuleResultsT
      >["contracts"],
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

  private _emitDeploymentStartEvent(moduleId: string): void {
    if (this._executionEventListener === undefined) {
      return;
    }

    this._executionEventListener.DEPLOYMENT_START({
      type: ExecutionEventType.DEPLOYMENT_START,
      moduleName: moduleId,
    });
  }

  private _emitDeploymentBatchEvent(batches: string[][]): void {
    if (this._executionEventListener === undefined) {
      return;
    }

    this._executionEventListener.BATCH_INITIALIZE({
      type: ExecutionEventType.BATCH_INITIALIZE,
      batches,
    });
  }

  private _emitDeploymentCompleteEvent(
    result: DeploymentResult<string, IgnitionModuleResult<string>>
  ): void {
    if (this._executionEventListener === undefined) {
      return;
    }

    this._executionEventListener.DEPLOYMENT_COMPLETE({
      type: ExecutionEventType.DEPLOYMENT_COMPLETE,
      result,
    });
  }

  private _isSuccessful(deploymentState: DeploymentState): boolean {
    return Object.values(deploymentState.executionStates).every(
      (ex) => ex.status === ExecutionStatus.SUCCESS
    );
  }

  private _getExecutionErrorResult(
    deploymentState: DeploymentState
  ): ExecutionErrorDeploymentResult {
    return {
      type: DeploymentResultType.EXECUTION_ERROR,
      started: Object.values(deploymentState.executionStates)
        .filter((ex) => ex.status === ExecutionStatus.STARTED)
        .map((ex) => ex.id),
      successful: Object.values(deploymentState.executionStates)
        .filter((ex) => ex.status === ExecutionStatus.SUCCESS)
        .map((ex) => ex.id),
      timedOut: Object.values(deploymentState.executionStates)
        .filter(canTimeout)
        .filter((ex) => ex.status === ExecutionStatus.TIMEOUT)
        .map((ex) => ({
          futureId: ex.id,
          executionId: ex.networkInteractions.at(-1)!.id,
        })),
      failed: Object.values(deploymentState.executionStates)
        .filter(canFail)
        .filter((ex) => ex.status === ExecutionStatus.FAILED)
        .map((ex) => {
          assertIgnitionInvariant(
            ex.result !== undefined &&
              ex.result.type !== ExecutionResultType.SUCCESS,
            `Execution state ${ex.id} is marked as failed but has no error result`
          );

          return {
            futureId: ex.id,
            executionId: ex.networkInteractions.at(-1)!.id,
            error: formatExecutionError(ex.result),
          };
        }),
    };
  }
}

// TODO: Does this exist anywhere else? It's in fact just checking if it sends txs
function canTimeout(
  exState: ExecutionState
): exState is
  | DeploymentExecutionState
  | CallExecutionState
  | SendDataExecutionState {
  return (
    exState.type === ExecutionSateType.DEPLOYMENT_EXECUTION_STATE ||
    exState.type === ExecutionSateType.CALL_EXECUTION_STATE ||
    exState.type === ExecutionSateType.SEND_DATA_EXECUTION_STATE
  );
}

// TODO: Does this exist anywhere else? It's in fact just checking if has network interactions
function canFail(
  exState: ExecutionState
): exState is
  | DeploymentExecutionState
  | CallExecutionState
  | SendDataExecutionState
  | StaticCallExecutionState {
  return (
    exState.type === ExecutionSateType.DEPLOYMENT_EXECUTION_STATE ||
    exState.type === ExecutionSateType.CALL_EXECUTION_STATE ||
    exState.type === ExecutionSateType.SEND_DATA_EXECUTION_STATE ||
    exState.type === ExecutionSateType.STATIC_CALL_EXECUTION_STATE
  );
}

// TODO: Does this exist somewhere else?
function getContractAddress(exState: ExecutionState): string {
  assertIgnitionInvariant(
    exState.type === ExecutionSateType.DEPLOYMENT_EXECUTION_STATE ||
      exState.type === ExecutionSateType.CONTRACT_AT_EXECUTION_STATE,
    `Execution state ${exState.id} should be a deployment or contract at execution state`
  );

  assertIgnitionInvariant(
    exState.status === ExecutionStatus.SUCCESS,
    `Cannot get contract address from execution state ${exState.id} because it is not successful`
  );

  if (exState.type === ExecutionSateType.CONTRACT_AT_EXECUTION_STATE) {
    return exState.contractAddress;
  }

  assertIgnitionInvariant(
    exState.result?.type === ExecutionResultType.SUCCESS,
    `Cannot get contract address from execution state ${exState.id} because it is not successful`
  );

  return exState.result.address;
}
