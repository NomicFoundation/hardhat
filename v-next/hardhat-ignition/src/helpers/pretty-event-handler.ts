import type {
  UiBatches,
  UiFuture,
  UiFutureErrored,
  UiFutureHeld,
  UiFutureStatus,
  UiFutureSuccess,
  UiState,
} from "../internal/ui/types.js";
import type {
  BatchInitializeEvent,
  BeginNextBatchEvent,
  CallExecutionStateCompleteEvent,
  CallExecutionStateInitializeEvent,
  ContractAtExecutionStateInitializeEvent,
  DeploymentCompleteEvent,
  DeploymentExecutionStateCompleteEvent,
  DeploymentExecutionStateInitializeEvent,
  DeploymentInitializeEvent,
  DeploymentParameters,
  DeploymentResult,
  DeploymentStartEvent,
  EncodeFunctionCallExecutionStateInitializeEvent,
  ExecutionEventListener,
  ExecutionEventResult,
  NetworkInteractionRequestEvent,
  OnchainInteractionBumpFeesEvent,
  OnchainInteractionDroppedEvent,
  OnchainInteractionReplacedByUserEvent,
  OnchainInteractionTimeoutEvent,
  ReadEventArgExecutionStateInitializeEvent,
  ReconciliationWarningsEvent,
  RunStartEvent,
  SendDataExecutionStateCompleteEvent,
  SendDataExecutionStateInitializeEvent,
  SetModuleIdEvent,
  SetStrategyEvent,
  StaticCallCompleteEvent,
  StaticCallExecutionStateCompleteEvent,
  StaticCallExecutionStateInitializeEvent,
  TransactionConfirmEvent,
  TransactionPrepareSendEvent,
  TransactionSendEvent,
  WipeApplyEvent,
} from "@nomicfoundation/ignition-core";
import type { UserInterruptionManager } from "hardhat/types/user-interruptions";

import readline from "node:readline";

import {
  DeploymentResultType,
  ExecutionEventResultType,
} from "@nomicfoundation/ignition-core";

import { calculateBatchDisplay } from "../internal/ui/helpers/calculate-batch-display.js";
import { calculateDeployingModulePanel } from "../internal/ui/helpers/calculate-deploying-module-panel.js";
import { calculateDeploymentCompleteDisplay } from "../internal/ui/helpers/calculate-deployment-complete-display.js";
import { calculateStartingMessage } from "../internal/ui/helpers/calculate-starting-message.js";
import { wasAnythingExecuted } from "../internal/ui/helpers/was-anything-executed.js";
import {
  UiFutureStatusType,
  UiStateDeploymentStatus,
} from "../internal/ui/types.js";

export class PrettyEventHandler implements ExecutionEventListener {
  public externalLinesWritten = 0;

  private readonly _config: {
    deploymentParams: DeploymentParameters;
    disableOutput: boolean;
  };

  private _uiState: UiState = {
    status: UiStateDeploymentStatus.UNSTARTED,
    chainId: null,
    moduleName: null,
    deploymentDir: null,
    batches: [],
    currentBatch: 0,
    result: null,
    warnings: [],
    isResumed: null,
    maxFeeBumps: 0,
    disableFeeBumping: null,
    gasBumps: {},
    strategy: null,
  };

  constructor(
    private readonly _interruptions: UserInterruptionManager,
    config?: {
      deploymentParams?: DeploymentParameters;
      disableOutput?: boolean;
    },
  ) {
    this._config = {
      ...{
        deploymentParams: {},
        disableOutput: false,
      },
      ...config,
    };
  }

  public get state(): UiState {
    return this._uiState;
  }

  public set state(uiState: UiState) {
    this._uiState = uiState;
  }

  public async deploymentStart(event: DeploymentStartEvent): Promise<void> {
    this.state = {
      ...this.state,
      status: UiStateDeploymentStatus.DEPLOYING,
      moduleName: event.moduleName,
      deploymentDir: event.deploymentDir,
      isResumed: event.isResumed,
      maxFeeBumps: event.maxFeeBumps,
      disableFeeBumping: event.disableFeeBumping,
    };

    await this._writeToDisplay(DisplayStage.STARTING_DEPLOYMENT);
  }

  public async deploymentInitialize(
    event: DeploymentInitializeEvent,
  ): Promise<void> {
    this.state = {
      ...this.state,
      chainId: event.chainId,
    };
  }

  public async runStart(_event: RunStartEvent): Promise<void> {
    await this._writeToDisplay(DisplayStage.RUN_START);
  }

  public async beginNextBatch(_event: BeginNextBatchEvent): Promise<void> {
    // rerender the previous batch
    if (this.state.currentBatch > 0) {
      await this._writeToDisplay(DisplayStage.REDISPLAY_BATCH);
    }

    this.state = {
      ...this.state,
      currentBatch: this.state.currentBatch + 1,
    };

    if (this.state.currentBatch === 0) {
      return;
    }

    // render the new batch
    await this._writeToDisplay(DisplayStage.DISPLAY_NEXT_BATCH);
  }

  public async wipeApply(event: WipeApplyEvent): Promise<void> {
    const batches: UiBatches = [];

    for (const batch of this.state.batches) {
      const futureBatch: UiFuture[] = [];

      for (const future of batch) {
        if (future.futureId === event.futureId) {
          continue;
        } else {
          futureBatch.push(future);
        }
      }

      batches.push(futureBatch);
    }

    this.state = {
      ...this.state,
      batches,
    };
  }

  public async deploymentExecutionStateInitialize(
    event: DeploymentExecutionStateInitializeEvent,
  ): Promise<void> {
    await this._setFutureStatusInitializedAndRedisplayBatch(event);
  }

  public async deploymentExecutionStateComplete(
    event: DeploymentExecutionStateCompleteEvent,
  ): Promise<void> {
    await this._setFutureStatusCompleteAndRedisplayBatch(event);
  }

  public async callExecutionStateInitialize(
    event: CallExecutionStateInitializeEvent,
  ): Promise<void> {
    await this._setFutureStatusInitializedAndRedisplayBatch(event);
  }

  public async callExecutionStateComplete(
    event: CallExecutionStateCompleteEvent,
  ): Promise<void> {
    await this._setFutureStatusCompleteAndRedisplayBatch(event);
  }

  public async staticCallExecutionStateInitialize(
    event: StaticCallExecutionStateInitializeEvent,
  ): Promise<void> {
    await this._setFutureStatusInitializedAndRedisplayBatch(event);
  }

  public async staticCallExecutionStateComplete(
    event: StaticCallExecutionStateCompleteEvent,
  ): Promise<void> {
    await this._setFutureStatusCompleteAndRedisplayBatch(event);
  }

  public async sendDataExecutionStateInitialize(
    event: SendDataExecutionStateInitializeEvent,
  ): Promise<void> {
    await this._setFutureStatusInitializedAndRedisplayBatch(event);
  }

  public async sendDataExecutionStateComplete(
    event: SendDataExecutionStateCompleteEvent,
  ): Promise<void> {
    await this._setFutureStatusCompleteAndRedisplayBatch(event);
  }

  public async contractAtExecutionStateInitialize(
    event: ContractAtExecutionStateInitializeEvent,
  ): Promise<void> {
    await this._setFutureStatusAndRedisplayBatch(event.futureId, {
      type: UiFutureStatusType.SUCCESS,
    });
  }

  public async readEventArgumentExecutionStateInitialize(
    event: ReadEventArgExecutionStateInitializeEvent,
  ): Promise<void> {
    await this._setFutureStatusAndRedisplayBatch(event.futureId, {
      type: UiFutureStatusType.SUCCESS,
    });
  }

  public async encodeFunctionCallExecutionStateInitialize(
    event: EncodeFunctionCallExecutionStateInitializeEvent,
  ): Promise<void> {
    await this._setFutureStatusAndRedisplayBatch(event.futureId, {
      type: UiFutureStatusType.SUCCESS,
    });
  }

  public async batchInitialize(event: BatchInitializeEvent): Promise<void> {
    const batches: UiBatches = [];

    for (const batch of event.batches) {
      const futureBatch: UiFuture[] = [];

      for (const futureId of batch) {
        futureBatch.push({
          futureId,
          status: {
            type: UiFutureStatusType.UNSTARTED,
          },
        });
      }

      batches.push(futureBatch);
    }

    this.state = {
      ...this.state,
      batches,
    };
  }

  public async networkInteractionRequest(
    _event: NetworkInteractionRequestEvent,
  ): Promise<void> {}

  public async transactionPrepareSend(
    _event: TransactionPrepareSendEvent,
  ): Promise<void> {}

  public async transactionSend(_event: TransactionSendEvent): Promise<void> {}

  public async transactionConfirm(
    _event: TransactionConfirmEvent,
  ): Promise<void> {}

  public async staticCallComplete(
    _event: StaticCallCompleteEvent,
  ): Promise<void> {}

  public async onchainInteractionBumpFees(
    event: OnchainInteractionBumpFeesEvent,
  ): Promise<void> {
    if (this._uiState.gasBumps[event.futureId] === undefined) {
      this._uiState.gasBumps[event.futureId] = 0;
    }

    this._uiState.gasBumps[event.futureId] += 1;

    await this._writeToDisplay(DisplayStage.REDISPLAY_BATCH);
  }

  public async onchainInteractionDropped(
    _event: OnchainInteractionDroppedEvent,
  ): Promise<void> {}

  public async onchainInteractionReplacedByUser(
    _event: OnchainInteractionReplacedByUserEvent,
  ): Promise<void> {}

  public async onchainInteractionTimeout(
    _event: OnchainInteractionTimeoutEvent,
  ): Promise<void> {}

  public async deploymentComplete(
    event: DeploymentCompleteEvent,
  ): Promise<void> {
    this.state = {
      ...this.state,
      status: UiStateDeploymentStatus.COMPLETE,
      result: event.result,
      batches: this._applyResultToBatches(this.state.batches, event.result),
    };

    await this._writeToDisplay(DisplayStage.DEPLOYMENT_COMPLETE);
  }

  public async reconciliationWarnings(
    event: ReconciliationWarningsEvent,
  ): Promise<void> {
    this.state = {
      ...this.state,
      warnings: [...this.state.warnings, ...event.warnings],
    };
  }

  public async setModuleId(event: SetModuleIdEvent): Promise<void> {
    this.state = {
      ...this.state,
      moduleName: event.moduleName,
    };
  }

  public async setStrategy(event: SetStrategyEvent): Promise<void> {
    this.state = {
      ...this.state,
      strategy: event.strategy,
    };
  }

  private async _setFutureStatusInitializedAndRedisplayBatch({
    futureId,
  }: {
    futureId: string;
  }): Promise<void> {
    await this._setFutureStatusAndRedisplayBatch(futureId, {
      type: UiFutureStatusType.UNSTARTED,
    });
  }

  private async _setFutureStatusCompleteAndRedisplayBatch({
    futureId,
    result,
  }: {
    futureId: string;
    result: ExecutionEventResult;
  }): Promise<void> {
    await this._setFutureStatusAndRedisplayBatch(
      futureId,
      this._getFutureStatusFromEventResult(result),
    );

    this.state = {
      ...this.state,
    };
  }

  private async _setFutureStatusAndRedisplayBatch(
    futureId: string,
    status: UiFutureStatus,
  ): Promise<void> {
    const updatedFuture: UiFuture = {
      futureId,
      status,
    };

    this.state = {
      ...this.state,
      batches: this._applyUpdateToBatchFuture(updatedFuture),
    };

    await this._writeToDisplay(DisplayStage.REDISPLAY_BATCH);
  }

  private _applyUpdateToBatchFuture(updatedFuture: UiFuture): UiBatches {
    const batches: UiBatches = [];

    for (const batch of this.state.batches) {
      const futureBatch: UiFuture[] = [];

      for (const future of batch) {
        if (future.futureId === updatedFuture.futureId) {
          futureBatch.push(updatedFuture);
        } else {
          futureBatch.push(future);
        }
      }

      batches.push(futureBatch);
    }

    return batches;
  }

  private _getFutureStatusFromEventResult(
    result: ExecutionEventResult,
  ): UiFutureSuccess | UiFutureErrored | UiFutureHeld {
    switch (result.type) {
      case ExecutionEventResultType.SUCCESS: {
        return {
          type: UiFutureStatusType.SUCCESS,
          result: result.result,
        };
      }
      case ExecutionEventResultType.ERROR: {
        return {
          type: UiFutureStatusType.ERRORED,
          message: result.error,
        };
      }
      case ExecutionEventResultType.HELD: {
        return {
          type: UiFutureStatusType.HELD,
          heldId: result.heldId,
          reason: result.reason,
        };
      }
    }
  }

  private _applyResultToBatches(
    batches: UiBatches,
    result: DeploymentResult,
  ): UiBatches {
    const newBatches: UiBatches = [];

    for (const oldBatch of batches) {
      const newBatch = [];
      for (const future of oldBatch) {
        const updatedFuture = this._hasUpdatedResult(future.futureId, result);

        newBatch.push(updatedFuture ?? future);
      }

      newBatches.push(newBatch);
    }

    return newBatches;
  }

  private _hasUpdatedResult(
    futureId: string,
    result: DeploymentResult,
  ): UiFuture | null {
    if (result.type !== DeploymentResultType.EXECUTION_ERROR) {
      return null;
    }

    const failed = result.failed.find((f) => f.futureId === futureId);

    if (failed !== undefined) {
      const f: UiFuture = {
        futureId,
        status: {
          type: UiFutureStatusType.ERRORED,
          message: failed.error,
        },
      };

      return f;
    }

    const timedout = result.timedOut.find((f) => f.futureId === futureId);

    if (timedout !== undefined) {
      const f: UiFuture = {
        futureId,
        status: {
          type: UiFutureStatusType.TIMEDOUT,
        },
      };

      return f;
    }

    return null;
  }

  private async _writeToDisplay(stage: DisplayStage): Promise<void> {
    await this._interruptions.uninterrupted(() => {
      if (!this._config.disableOutput) {
        switch (stage) {
          case DisplayStage.STARTING_DEPLOYMENT: {
            process.stdout.write(calculateStartingMessage(this.state));
            break;
          }
          case DisplayStage.RUN_START: {
            this._clearCurrentLine();
            console.log(calculateDeployingModulePanel(this.state));
            break;
          }
          case DisplayStage.DISPLAY_NEXT_BATCH: {
            console.log(calculateBatchDisplay(this.state).text);
            break;
          }
          case DisplayStage.REDISPLAY_BATCH: {
            this._redisplayCurrentBatch();
            break;
          }
          case DisplayStage.DEPLOYMENT_COMPLETE: {
            // If batches were executed, rerender the last batch
            if (wasAnythingExecuted(this.state)) {
              this._redisplayCurrentBatch();
            } else {
              // Otherwise only the completion panel will be shown so clear
              // the Starting Ignition line.
              this._clearCurrentLine();
            }

            console.log(calculateDeploymentCompleteDisplay(this.state));
            break;
          }
        }
      }
    });
  }

  private _redisplayCurrentBatch() {
    const { height, text: batch } = calculateBatchDisplay(this.state);

    this._clearUpToHeight(height + this.externalLinesWritten);

    console.log(batch);

    this.externalLinesWritten = 0;
  }

  private _clearCurrentLine(): void {
    readline.clearLine(process.stdout, 0);
    readline.cursorTo(process.stdout, 0);
  }

  private _clearUpToHeight(height: number): void {
    readline.moveCursor(process.stdout, 0, -height);
    readline.clearScreenDown(process.stdout);
  }
}

export enum DisplayStage {
  STARTING_DEPLOYMENT = "STARTING_DEPLOYMENT",
  RUN_START = "RUN_START",
  DISPLAY_NEXT_BATCH = "DISPLAY_NEXT_BATCH",
  REDISPLAY_BATCH = "REDISPLAY_BATCH",
  DEPLOYMENT_COMPLETE = "DEPLOYMENT_COMPLETE",
}
