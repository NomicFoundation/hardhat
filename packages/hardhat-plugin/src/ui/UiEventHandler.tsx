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
  IgnitionError,
  IgnitionModuleResult,
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
import { render } from "ink";

import { IgnitionUi } from "./components";
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

interface RenderState {
  rerender: null | ((node: React.ReactNode) => void);
  unmount: null | (() => void);
  waitUntilExit: null | (() => Promise<void>);
  clear: null | (() => void);
}

export class UiEventHandler implements ExecutionEventListener {
  private _renderState: RenderState = {
    rerender: null,
    unmount: null,
    waitUntilExit: null,
    clear: null,
  };

  private _uiState: UiState = {
    status: UiStateDeploymentStatus.UNSTARTED,
    chainId: null,
    moduleName: null,
    batches: [],
    result: null,
    warnings: [],
  };

  constructor(private _deploymentParams: DeploymentParameters = {}) {}

  public get state(): UiState {
    return this._uiState;
  }

  public set state(uiState: UiState) {
    this._uiState = uiState;

    this._renderToCli();
  }

  public runStart(event: RunStartEvent): void {
    this.state = {
      ...this.state,
      chainId: event.chainId,
    };
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

  public deploymentStart(event: DeploymentStartEvent): void {
    this.state = {
      ...this.state,
      status: UiStateDeploymentStatus.DEPLOYING,
      moduleName: event.moduleName,
    };
  }

  public beginNextBatch(_event: BeginNextBatchEvent): void {}

  public deploymentComplete(event: DeploymentCompleteEvent): void {
    this.state = {
      ...this.state,
      status: UiStateDeploymentStatus.COMPLETE,
      result: event.result,
      batches: this._applyResultToBatches(this.state.batches, event.result),
    };
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

  public unmountCli(): void {
    if (
      this._renderState.unmount === null ||
      this._renderState.waitUntilExit === null ||
      this._renderState.clear === null
    ) {
      throw new IgnitionError("Cannot unmount with no unmount function");
    }

    this._renderState.clear();
    this._renderState.unmount();
  }

  private _renderToCli(): void {
    if (this._renderState.rerender === null) {
      const { rerender, unmount, waitUntilExit, clear } = render(
        <IgnitionUi state={this.state} deployParams={this._deploymentParams} />,
        { patchConsole: false }
      );

      this._renderState.rerender = rerender;
      this._renderState.unmount = unmount;
      this._renderState.waitUntilExit = waitUntilExit;
      this._renderState.clear = clear;

      return;
    }

    this._renderState.rerender(
      <IgnitionUi state={this.state} deployParams={this._deploymentParams} />
    );
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
    result: DeploymentResult<string, IgnitionModuleResult<string>>
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
    result: DeploymentResult<string, IgnitionModuleResult<string>>
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
