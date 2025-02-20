/* eslint-disable no-restricted-syntax */
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
  TransactionSendEvent,
  WipeApplyEvent,
} from "@nomicfoundation/ignition-core";

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
    private readonly _deploymentParams: DeploymentParameters = {},
    private readonly _disableOutput = false,
  ) {}

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
      deploymentDir: event.deploymentDir,
      isResumed: event.isResumed,
      maxFeeBumps: event.maxFeeBumps,
      disableFeeBumping: event.disableFeeBumping,
    };

    process.stdout.write(calculateStartingMessage(this.state));
  }

  public deploymentInitialize(event: DeploymentInitializeEvent): void {
    this.state = {
      ...this.state,
      chainId: event.chainId,
    };
  }

  public runStart(_event: RunStartEvent): void {
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
    event: DeploymentExecutionStateInitializeEvent,
  ): void {
    this._setFutureStatusInitializedAndRedisplayBatch(event);
  }

  public deploymentExecutionStateComplete(
    event: DeploymentExecutionStateCompleteEvent,
  ): void {
    this._setFutureStatusCompleteAndRedisplayBatch(event);
  }

  public callExecutionStateInitialize(
    event: CallExecutionStateInitializeEvent,
  ): void {
    this._setFutureStatusInitializedAndRedisplayBatch(event);
  }

  public callExecutionStateComplete(
    event: CallExecutionStateCompleteEvent,
  ): void {
    this._setFutureStatusCompleteAndRedisplayBatch(event);
  }

  public staticCallExecutionStateInitialize(
    event: StaticCallExecutionStateInitializeEvent,
  ): void {
    this._setFutureStatusInitializedAndRedisplayBatch(event);
  }

  public staticCallExecutionStateComplete(
    event: StaticCallExecutionStateCompleteEvent,
  ): void {
    this._setFutureStatusCompleteAndRedisplayBatch(event);
  }

  public sendDataExecutionStateInitialize(
    event: SendDataExecutionStateInitializeEvent,
  ): void {
    this._setFutureStatusInitializedAndRedisplayBatch(event);
  }

  public sendDataExecutionStateComplete(
    event: SendDataExecutionStateCompleteEvent,
  ): void {
    this._setFutureStatusCompleteAndRedisplayBatch(event);
  }

  public contractAtExecutionStateInitialize(
    event: ContractAtExecutionStateInitializeEvent,
  ): void {
    this._setFutureStatusAndRedisplayBatch(event.futureId, {
      type: UiFutureStatusType.SUCCESS,
    });
  }

  public readEventArgumentExecutionStateInitialize(
    event: ReadEventArgExecutionStateInitializeEvent,
  ): void {
    this._setFutureStatusAndRedisplayBatch(event.futureId, {
      type: UiFutureStatusType.SUCCESS,
    });
  }

  public encodeFunctionCallExecutionStateInitialize(
    event: EncodeFunctionCallExecutionStateInitializeEvent,
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
    _event: NetworkInteractionRequestEvent,
  ): void {}

  public transactionSend(_event: TransactionSendEvent): void {}

  public transactionConfirm(_event: TransactionConfirmEvent): void {}

  public staticCallComplete(_event: StaticCallCompleteEvent): void {}

  public onchainInteractionBumpFees(
    event: OnchainInteractionBumpFeesEvent,
  ): void {
    if (this._uiState.gasBumps[event.futureId] === undefined) {
      this._uiState.gasBumps[event.futureId] = 0;
    }

    this._uiState.gasBumps[event.futureId] += 1;

    this._redisplayCurrentBatch();
  }

  public onchainInteractionDropped(
    _event: OnchainInteractionDroppedEvent,
  ): void {}

  public onchainInteractionReplacedByUser(
    _event: OnchainInteractionReplacedByUserEvent,
  ): void {}

  public onchainInteractionTimeout(
    _event: OnchainInteractionTimeoutEvent,
  ): void {}

  public deploymentComplete(event: DeploymentCompleteEvent): void {
    this.state = {
      ...this.state,
      status: UiStateDeploymentStatus.COMPLETE,
      result: event.result,
      batches: this._applyResultToBatches(this.state.batches, event.result),
    };

    // If batches where executed, rerender the last batch
    if (wasAnythingExecuted(this.state)) {
      this._redisplayCurrentBatch();
    } else {
      // Otherwise only the completion panel will be shown so clear
      // the Starting Ignition line.
      this._clearCurrentLine();
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

  public setStrategy(event: SetStrategyEvent): void {
    this.state = {
      ...this.state,
      strategy: event.strategy,
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
      this._getFutureStatusFromEventResult(result),
    );

    this.state = {
      ...this.state,
    };
  }

  private _setFutureStatusAndRedisplayBatch(
    futureId: string,
    status: UiFutureStatus,
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

  private _redisplayCurrentBatch() {
    if (!this._disableOutput) {
      const { height, text: batch } = calculateBatchDisplay(this.state);

      this._clearUpToHeight(height);

      console.log(batch);
    }
  }

  private _clearCurrentLine(): void {
    readline.clearLine(process.stdout, 0);
    readline.cursorTo(process.stdout, 0);
  }

  private _clearUpToHeight(height: number) {
    readline.moveCursor(process.stdout, 0, -height);
    readline.clearScreenDown(process.stdout);
  }
}
