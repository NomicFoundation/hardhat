import {
  BatchInitializeEvent,
  BeginNextBatchEvent,
  CallExecutionStateCompleteEvent,
  CallExecutionStateInitializeEvent,
  ContractAtExecutionStateInitializeEvent,
  DeploymentCompleteEvent,
  DeploymentExecutionStateCompleteEvent,
  DeploymentExecutionStateInitializeEvent,
  DeploymentStartEvent,
  ExecutionEventListener,
  ExecutionEventNetworkInteractionType,
  ExecutionEventResultType,
  ExecutionEventType,
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

export class VerboseEventHandler implements ExecutionEventListener {
  public [ExecutionEventType.RUN_START](event: RunStartEvent): void {
    console.log(`Deployment started for chainId: ${event.chainId}`);
  }

  public [ExecutionEventType.WIPE_EXECUTION_STATE](
    event: WipeExecutionStateEvent
  ): void {
    console.log(`Removing the execution of future ${event.futureId}`);
  }

  public [ExecutionEventType.DEPLOYMENT_EXECUTION_STATE_INITIALIZE](
    event: DeploymentExecutionStateInitializeEvent
  ): void {
    console.log(`Starting to execute the deployment future ${event.futureId}`);
  }

  public [ExecutionEventType.DEPLOYMENT_EXECUTION_STATE_COMPLETE](
    event: DeploymentExecutionStateCompleteEvent
  ): void {
    if (event.result.type === ExecutionEventResultType.SUCCESS) {
      console.log(
        `Successfully completed the execution of deployment future ${
          event.futureId
        } with address ${event.result.result ?? "undefined"}`
      );
    } else {
      console.log(
        `Execution of future ${event.futureId} failed with reason: ${event.result.error}`
      );
    }
  }

  public [ExecutionEventType.CALL_EXECUTION_STATE_INITIALIZE](
    event: CallExecutionStateInitializeEvent
  ): void {
    console.log(`Starting to execute the call future ${event.futureId}`);
  }

  public [ExecutionEventType.CALL_EXECUTION_STATE_COMPLETE](
    event: CallExecutionStateCompleteEvent
  ): void {
    if (event.result.type === ExecutionEventResultType.SUCCESS) {
      console.log(
        `Successfully completed the execution of call future ${event.futureId}`
      );
    } else {
      console.log(
        `Execution of future ${event.futureId} failed with reason: ${event.result.error}`
      );
    }
  }

  public [ExecutionEventType.STATIC_CALL_EXECUTION_STATE_INITIALIZE](
    event: StaticCallExecutionStateInitializeEvent
  ): void {
    console.log(`Starting to execute the static call future ${event.futureId}`);
  }

  public [ExecutionEventType.STATIC_CALL_EXECUTION_STATE_COMPLETE](
    event: StaticCallExecutionStateCompleteEvent
  ): void {
    if (event.result.type === ExecutionEventResultType.SUCCESS) {
      console.log(
        `Successfully completed the execution of static call future ${
          event.futureId
        } with result ${event.result.result ?? "undefined"}`
      );
    } else {
      console.log(
        `Execution of future ${event.futureId} failed with reason: ${event.result.error}`
      );
    }
  }

  public [ExecutionEventType.SEND_DATA_EXECUTION_STATE_INITIALIZE](
    event: SendDataExecutionStateInitializeEvent
  ): void {
    console.log(`Started to execute the send data future ${event.futureId}`);
  }

  public [ExecutionEventType.SEND_DATA_EXECUTION_STATE_COMPLETE](
    event: SendDataExecutionStateCompleteEvent
  ): void {
    if (event.result.type === ExecutionEventResultType.SUCCESS) {
      console.log(
        `Successfully completed the execution of send data future ${
          event.futureId
        } in tx ${event.result.result ?? "undefined"}`
      );
    } else {
      console.log(
        `Execution of future ${event.futureId} failed with reason: ${event.result.error}`
      );
    }
  }

  public [ExecutionEventType.CONTRACT_AT_EXECUTION_STATE_INITIALIZE](
    event: ContractAtExecutionStateInitializeEvent
  ): void {
    console.log(`Executed contract at future ${event.futureId}`);
  }

  public [ExecutionEventType.READ_EVENT_ARGUMENT_EXECUTION_STATE_INITIALIZE](
    event: ReadEventArgExecutionStateInitializeEvent
  ): void {
    console.log(
      `Executed read event argument future ${event.futureId} with result ${
        event.result.result ?? "undefined"
      }`
    );
  }

  public [ExecutionEventType.NETWORK_INTERACTION_REQUEST](
    event: NetworkInteractionRequestEvent
  ): void {
    if (
      event.networkInteractionType ===
      ExecutionEventNetworkInteractionType.ONCHAIN_INTERACTION
    ) {
      console.log(
        `New onchain interaction requested for future ${event.futureId}`
      );
    } else {
      console.log(`New static call requested for future ${event.futureId}`);
    }
  }

  public [ExecutionEventType.TRANSACTION_SEND](
    event: TransactionSendEvent
  ): void {
    console.log(
      `Transaction ${event.hash} sent for onchain interaction of future ${event.futureId}`
    );
  }

  public [ExecutionEventType.TRANSACTION_CONFIRM](
    event: TransactionConfirmEvent
  ): void {
    console.log(`Transaction ${event.hash} confirmed`);
  }

  public [ExecutionEventType.STATIC_CALL_COMPLETE](
    event: StaticCallCompleteEvent
  ): void {
    console.log(`Static call completed for future ${event.futureId}`);
  }

  public [ExecutionEventType.ONCHAIN_INTERACTION_BUMP_FEES](
    event: OnchainInteractionBumpFeesEvent
  ): void {
    console.log(
      `A transaction with higher fees will be sent for onchain interaction of future ${event.futureId}`
    );
  }

  public [ExecutionEventType.ONCHAIN_INTERACTION_DROPPED](
    event: OnchainInteractionDroppedEvent
  ): void {
    console.log(
      `Transactions for onchain interaction of future ${event.futureId} has been dropped and will be resent`
    );
  }

  public [ExecutionEventType.ONCHAIN_INTERACTION_REPLACED_BY_USER](
    event: OnchainInteractionReplacedByUserEvent
  ): void {
    console.log(
      `Transactions for onchain interaction of future ${event.futureId} has been replaced by the user and the onchain interaction exection will start again`
    );
  }

  public [ExecutionEventType.ONCHAIN_INTERACTION_TIMEOUT](
    event: OnchainInteractionTimeoutEvent
  ): void {
    console.log(
      `Onchain interaction of future ${event.futureId} failed due to being resent too many times and not having confirmed`
    );
  }

  public [ExecutionEventType.BATCH_INITIALIZE](
    event: BatchInitializeEvent
  ): void {
    console.log(
      `Starting execution for batches: ${JSON.stringify(event.batches)}`
    );
  }

  public [ExecutionEventType.DEPLOYMENT_START](
    _event: DeploymentStartEvent
  ): void {
    console.log(`Starting execution for new deployment`);
  }

  public [ExecutionEventType.BEGIN_NEXT_BATCH](
    _event: BeginNextBatchEvent
  ): void {
    console.log(`Starting execution for next batch`);
  }

  public [ExecutionEventType.DEPLOYMENT_COMPLETE](
    _event: DeploymentCompleteEvent
  ): void {
    console.log(`Deployment complete`);
  }

  public [ExecutionEventType.SET_MODULE_ID](event: SetModuleIdEvent): void {
    console.log(`Starting validation for module: ${event.moduleName}`);
  }
}
