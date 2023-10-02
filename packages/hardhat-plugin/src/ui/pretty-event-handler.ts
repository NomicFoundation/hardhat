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

import { displayBatch, redisplayBatch } from "./helpers/display-batch";
import { displayDeployingModulePanel } from "./helpers/display-deploying-module-panel";
import { displayDeploymentComplete } from "./helpers/display-deployment-complete";
import { displaySeparator } from "./helpers/display-separator";
import { displayStartingMessage } from "./helpers/display-starting-message";
import {
  UiBatches,
  UiFuture,
  UiFutureErrored,
  UiFutureHeld,
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

    displayDeployingModulePanel(this.state);
  }

  public beginNextBatch(_event: BeginNextBatchEvent): void {
    // rerender the previous batch
    redisplayBatch(this.state);

    this.state = {
      ...this.state,
      currentBatch: this.state.currentBatch + 1,
    };

    displayBatch(this.state);
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
    const updatedFuture: UiFuture = {
      futureId: event.futureId,
      status: {
        type: UiFutureStatusType.PENDING,
      },
    };

    this.state = {
      ...this.state,
      batches: this._applyUpdateToBatchFuture(updatedFuture),
    };
  }

  public deploymentExecutionStateComplete(
    event: DeploymentExecutionStateCompleteEvent
  ): void {
    const updatedFuture: UiFuture = {
      futureId: event.futureId,
      status: this._getFutureStatusFromEventResult(event.result),
    };

    this.state = {
      ...this.state,
      batches: this._applyUpdateToBatchFuture(updatedFuture),
    };

    redisplayBatch(this.state);
  }

  public callExecutionStateInitialize(
    event: CallExecutionStateInitializeEvent
  ): void {
    const updatedFuture: UiFuture = {
      futureId: event.futureId,
      status: {
        type: UiFutureStatusType.PENDING,
      },
    };

    this.state = {
      ...this.state,
      batches: this._applyUpdateToBatchFuture(updatedFuture),
    };
  }

  public callExecutionStateComplete(
    event: CallExecutionStateCompleteEvent
  ): void {
    const updatedFuture: UiFuture = {
      futureId: event.futureId,
      status: this._getFutureStatusFromEventResult(event.result),
    };

    this.state = {
      ...this.state,
      batches: this._applyUpdateToBatchFuture(updatedFuture),
    };
  }

  public staticCallExecutionStateInitialize(
    event: StaticCallExecutionStateInitializeEvent
  ): void {
    const updatedFuture: UiFuture = {
      futureId: event.futureId,
      status: {
        type: UiFutureStatusType.PENDING,
      },
    };

    this.state = {
      ...this.state,
      batches: this._applyUpdateToBatchFuture(updatedFuture),
    };
  }

  public staticCallExecutionStateComplete(
    event: StaticCallExecutionStateCompleteEvent
  ): void {
    const updatedFuture: UiFuture = {
      futureId: event.futureId,
      status: this._getFutureStatusFromEventResult(event.result),
    };

    this.state = {
      ...this.state,
      batches: this._applyUpdateToBatchFuture(updatedFuture),
    };
  }

  public sendDataExecutionStateInitialize(
    event: SendDataExecutionStateInitializeEvent
  ): void {
    const updatedFuture: UiFuture = {
      futureId: event.futureId,
      status: {
        type: UiFutureStatusType.PENDING,
      },
    };

    this.state = {
      ...this.state,
      batches: this._applyUpdateToBatchFuture(updatedFuture),
    };
  }

  public sendDataExecutionStateComplete(
    event: SendDataExecutionStateCompleteEvent
  ): void {
    const updatedFuture: UiFuture = {
      futureId: event.futureId,
      status: this._getFutureStatusFromEventResult(event.result),
    };

    this.state = {
      ...this.state,
      batches: this._applyUpdateToBatchFuture(updatedFuture),
    };
  }

  public contractAtExecutionStateInitialize(
    event: ContractAtExecutionStateInitializeEvent
  ): void {
    const updatedFuture: UiFuture = {
      futureId: event.futureId,
      status: {
        type: UiFutureStatusType.SUCCESS,
      },
    };

    this.state = {
      ...this.state,
      batches: this._applyUpdateToBatchFuture(updatedFuture),
    };
  }

  public readEventArgumentExecutionStateInitialize(
    event: ReadEventArgExecutionStateInitializeEvent
  ): void {
    const updatedFuture: UiFuture = {
      futureId: event.futureId,
      status: {
        type: UiFutureStatusType.SUCCESS,
      },
    };

    this.state = {
      ...this.state,
      batches: this._applyUpdateToBatchFuture(updatedFuture),
    };
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
      redisplayBatch(this.state);

      displaySeparator();
    }

    displayDeploymentComplete(this.state, event);
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
          type: UiFutureStatusType.PENDING,
        },
      };

      return f;
    }

    return null;
  }
}
