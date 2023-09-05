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
  ExecutionEventType,
  IgnitionError,
  IgnitionModuleResult,
  NetworkInteractionRequestEvent,
  OnchainInteractionBumpFeesEvent,
  OnchainInteractionDroppedEvent,
  OnchainInteractionReplacedByUserEvent,
  OnchainInteractionTimeoutEvent,
  ReadEventArgExecutionStateInitializeEvent,
  RunStartEvent,
  SendDataExecutionStateCompleteEvent,
  SendDataExecutionStateInitializeEvent,
  SetModuleIdEvent,
  StaticCallCompleteEvent,
  StaticCallExecutionStateCompleteEvent,
  StaticCallExecutionStateInitializeEvent,
  TransactionConfirmEvent,
  TransactionSendEvent,
  WipeExecutionStateEvent,
} from "@ignored/ignition-core";
import { render } from "ink";

import { IgnitionUi } from "./components";
import {
  UiBatches,
  UiFuture,
  UiFutureErrored,
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
  };

  constructor(private _deploymentParams: DeploymentParameters = {}) {}

  public get state(): UiState {
    return this._uiState;
  }

  public set state(uiState: UiState) {
    this._uiState = uiState;

    this._renderToCli();
  }

  public [ExecutionEventType.RUN_START](event: RunStartEvent): void {
    this.state = {
      ...this.state,
      chainId: event.chainId,
    };
  }

  public [ExecutionEventType.WIPE_EXECUTION_STATE](
    event: WipeExecutionStateEvent
  ): void {
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

  public [ExecutionEventType.DEPLOYMENT_EXECUTION_STATE_INITIALIZE](
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

  public [ExecutionEventType.DEPLOYMENT_EXECUTION_STATE_COMPLETE](
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

  public [ExecutionEventType.CALL_EXECUTION_STATE_INITIALIZE](
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

  public [ExecutionEventType.CALL_EXECUTION_STATE_COMPLETE](
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

  public [ExecutionEventType.STATIC_CALL_EXECUTION_STATE_INITIALIZE](
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

  public [ExecutionEventType.STATIC_CALL_EXECUTION_STATE_COMPLETE](
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

  public [ExecutionEventType.SEND_DATA_EXECUTION_STATE_INITIALIZE](
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

  public [ExecutionEventType.SEND_DATA_EXECUTION_STATE_COMPLETE](
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

  public [ExecutionEventType.CONTRACT_AT_EXECUTION_STATE_INITIALIZE](
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

  public [ExecutionEventType.READ_EVENT_ARGUMENT_EXECUTION_STATE_INITIALIZE](
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

  public [ExecutionEventType.BATCH_INITIALIZE](
    event: BatchInitializeEvent
  ): void {
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

  public [ExecutionEventType.NETWORK_INTERACTION_REQUEST](
    _event: NetworkInteractionRequestEvent
  ): void {}

  public [ExecutionEventType.TRANSACTION_SEND](
    _event: TransactionSendEvent
  ): void {}

  public [ExecutionEventType.TRANSACTION_CONFIRM](
    _event: TransactionConfirmEvent
  ): void {}

  public [ExecutionEventType.STATIC_CALL_COMPLETE](
    _event: StaticCallCompleteEvent
  ): void {}

  public [ExecutionEventType.ONCHAIN_INTERACTION_BUMP_FEES](
    _event: OnchainInteractionBumpFeesEvent
  ): void {}

  public [ExecutionEventType.ONCHAIN_INTERACTION_DROPPED](
    _event: OnchainInteractionDroppedEvent
  ): void {}

  public [ExecutionEventType.ONCHAIN_INTERACTION_REPLACED_BY_USER](
    _event: OnchainInteractionReplacedByUserEvent
  ): void {}

  public [ExecutionEventType.ONCHAIN_INTERACTION_TIMEOUT](
    _event: OnchainInteractionTimeoutEvent
  ): void {}

  public [ExecutionEventType.DEPLOYMENT_START](
    event: DeploymentStartEvent
  ): void {
    this.state = {
      ...this.state,
      status: UiStateDeploymentStatus.DEPLOYING,
      moduleName: event.moduleName,
    };
  }

  public [ExecutionEventType.BEGIN_NEXT_BATCH](
    _event: BeginNextBatchEvent
  ): void {}

  public [ExecutionEventType.DEPLOYMENT_COMPLETE](
    event: DeploymentCompleteEvent
  ): void {
    this.state = {
      ...this.state,
      status: UiStateDeploymentStatus.COMPLETE,
      result: event.result,
      batches: this._applyResultToBatches(this.state.batches, event.result),
    };
  }

  public [ExecutionEventType.SET_MODULE_ID](event: SetModuleIdEvent): void {
    this.state = {
      ...this.state,
      moduleName: event.moduleName,
    };
  }

  public unmountCli(): Promise<void> {
    if (
      this._renderState.unmount === null ||
      this._renderState.waitUntilExit === null ||
      this._renderState.clear === null
    ) {
      throw new IgnitionError("Cannot unmount with no unmount function");
    }

    this._renderState.clear();
    this._renderState.unmount();

    return this._renderState.waitUntilExit();
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
  ): UiFutureSuccess | UiFutureErrored {
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
