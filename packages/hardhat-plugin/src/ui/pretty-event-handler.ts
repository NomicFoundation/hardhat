import {
  BatchInitializeEvent,
  BeginNextBatchEvent,
  CallExecutionStateCompleteEvent,
  CallExecutionStateInitializeEvent,
  ContractAtExecutionStateInitializeEvent,
  DeploymentCompleteEvent,
  DeploymentExecutionStateCompleteEvent,
  DeploymentExecutionStateInitializeEvent,
  DeploymentParameters,
  DeploymentResult,
  DeploymentResultType,
  DeploymentStartEvent,
  ExecutionEventListener,
  ExecutionEventResult,
  ExecutionEventResultType,
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
  StaticCallCompleteEvent,
  StaticCallExecutionStateCompleteEvent,
  StaticCallExecutionStateInitializeEvent,
  TransactionConfirmEvent,
  TransactionSendEvent,
  WipeApplyEvent,
} from "@nomicfoundation/ignition-core";

import { calculateBatchDisplay } from "./helpers/calculate-batch-display";
import { calculateDeployingModulePanel } from "./helpers/calculate-deploying-module-panel";
import { calculateDeploymentCompleteDisplay } from "./helpers/calculate-deployment-complete-display";
import { displayStartingMessage } from "./helpers/display-starting-message";
import {
  UiBatches,
  UiFuture,
  UiFutureErrored,
  UiFutureHeld,
  UiFutureStatus,
  UiFutureStatusType,
  UiFutureSuccess,
  UiState,
  UiStateDeploymentStatus,
} from "./types";

export class PrettyEventHandler implements ExecutionEventListener {
  private _uiState: UiState = {
    status: UiStateDeploymentStatus.UNSTARTED,
    chainId: null,
    moduleName: null,
    batches: [],
    currentBatch: 0,
    result: null,
    warnings: [],
  };

  constructor(private _deploymentParams: DeploymentParameters = {}) {}

  public get state(): UiState {
    return this._uiState;
  }

  public set state(uiState: UiState) {
    this._uiState = uiState;
  }

  public deploymentStart(event: DeploymentStartEvent): void {
    this.state = {
      ...this.state,
      status: UiStateDeploymentStatus.DEPLOYING,
      moduleName: event.moduleName,
    };

    displayStartingMessage(this.state);
  }

  public runStart(event: RunStartEvent): void {
    this.state = {
      ...this.state,
      chainId: event.chainId,
    };

    this._clearCurrentLine();
    console.log(calculateDeployingModulePanel(this.state));
  }

  public beginNextBatch(_event: BeginNextBatchEvent): void {
    // rerender the previous batch
    if (this.state.currentBatch > 0) {
      this._redisplayCurrentBatch();
    }

    this.state = {
      ...this.state,
      currentBatch: this.state.currentBatch + 1,
    };

    if (this.state.currentBatch === 0) {
      return;
    }

    // render the new batch
    console.log(calculateBatchDisplay(this.state).text);
  }

  public wipeApply(event: WipeApplyEvent): void {
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

  public deploymentExecutionStateInitialize(
    event: DeploymentExecutionStateInitializeEvent
  ): void {
    this._setFutureStatusInitializedAndRedisplayBatch(event);
  }

  public deploymentExecutionStateComplete(
    event: DeploymentExecutionStateCompleteEvent
  ): void {
    this._setFutureStatusCompleteAndRedisplayBatch(event);
  }

  public callExecutionStateInitialize(
    event: CallExecutionStateInitializeEvent
  ): void {
    this._setFutureStatusInitializedAndRedisplayBatch(event);
  }

  public callExecutionStateComplete(
    event: CallExecutionStateCompleteEvent
  ): void {
    this._setFutureStatusCompleteAndRedisplayBatch(event);
  }

  public staticCallExecutionStateInitialize(
    event: StaticCallExecutionStateInitializeEvent
  ): void {
    this._setFutureStatusInitializedAndRedisplayBatch(event);
  }

  public staticCallExecutionStateComplete(
    event: StaticCallExecutionStateCompleteEvent
  ): void {
    this._setFutureStatusCompleteAndRedisplayBatch(event);
  }

  public sendDataExecutionStateInitialize(
    event: SendDataExecutionStateInitializeEvent
  ): void {
    this._setFutureStatusInitializedAndRedisplayBatch(event);
  }

  public sendDataExecutionStateComplete(
    event: SendDataExecutionStateCompleteEvent
  ): void {
    this._setFutureStatusCompleteAndRedisplayBatch(event);
  }

  public contractAtExecutionStateInitialize(
    event: ContractAtExecutionStateInitializeEvent
  ): void {
    this._setFutureStatusAndRedisplayBatch(event.futureId, {
      type: UiFutureStatusType.SUCCESS,
    });
  }

  public readEventArgumentExecutionStateInitialize(
    event: ReadEventArgExecutionStateInitializeEvent
  ): void {
    this._setFutureStatusAndRedisplayBatch(event.futureId, {
      type: UiFutureStatusType.SUCCESS,
    });
  }

  public batchInitialize(event: BatchInitializeEvent): void {
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

  public networkInteractionRequest(
    _event: NetworkInteractionRequestEvent
  ): void {}

  public transactionSend(_event: TransactionSendEvent): void {}

  public transactionConfirm(_event: TransactionConfirmEvent): void {}

  public staticCallComplete(_event: StaticCallCompleteEvent): void {}

  public onchainInteractionBumpFees(
    _event: OnchainInteractionBumpFeesEvent
  ): void {}

  public onchainInteractionDropped(
    _event: OnchainInteractionDroppedEvent
  ): void {}

  public onchainInteractionReplacedByUser(
    _event: OnchainInteractionReplacedByUserEvent
  ): void {}

  public onchainInteractionTimeout(
    _event: OnchainInteractionTimeoutEvent
  ): void {}

  public deploymentComplete(event: DeploymentCompleteEvent): void {
    const originalStatus = this.state.status;

    this.state = {
      ...this.state,
      status: UiStateDeploymentStatus.COMPLETE,
      result: event.result,
      batches: this._applyResultToBatches(this.state.batches, event.result),
    };

    if (originalStatus !== UiStateDeploymentStatus.UNSTARTED) {
      this._redisplayCurrentBatch();
      this._clearUpToHeight(1);
    }

    console.log(calculateDeploymentCompleteDisplay(event, this.state));
  }

  public reconciliationWarnings(event: ReconciliationWarningsEvent): void {
    this.state = {
      ...this.state,
      warnings: [...this.state.warnings, ...event.warnings],
    };
  }

  public setModuleId(event: SetModuleIdEvent): void {
    this.state = {
      ...this.state,
      moduleName: event.moduleName,
    };
  }

  private _setFutureStatusInitializedAndRedisplayBatch({
    futureId,
  }: {
    futureId: string;
  }) {
    this._setFutureStatusAndRedisplayBatch(futureId, {
      type: UiFutureStatusType.UNSTARTED,
    });
  }

  private _setFutureStatusCompleteAndRedisplayBatch({
    futureId,
    result,
  }: {
    futureId: string;
    result: ExecutionEventResult;
  }) {
    this._setFutureStatusAndRedisplayBatch(
      futureId,
      this._getFutureStatusFromEventResult(result)
    );
  }

  private _setFutureStatusAndRedisplayBatch(
    futureId: string,
    status: UiFutureStatus
  ) {
    const updatedFuture: UiFuture = {
      futureId,
      status,
    };

    this.state = {
      ...this.state,
      batches: this._applyUpdateToBatchFuture(updatedFuture),
    };

    this._redisplayCurrentBatch();
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
    result: ExecutionEventResult
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
    result: DeploymentResult
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
    result: DeploymentResult
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

  private _redisplayCurrentBatch() {
    const { height, text: batch } = calculateBatchDisplay(this.state);

    this._clearUpToHeight(height);

    console.log(batch);
  }

  private _clearCurrentLine(): void {
    process.stdout.clearLine(0);
    process.stdout.cursorTo(0);
  }

  private _clearUpToHeight(height: number) {
    process.stdout.moveCursor(0, -height);
    process.stdout.clearScreenDown();
  }
}
