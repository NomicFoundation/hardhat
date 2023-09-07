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
  public runStart(event: RunStartEvent): void {
    console.log(`Deployment started for chainId: ${event.chainId}`);
  }

  public wipeExecutionState(event: WipeExecutionStateEvent): void {
    console.log(`Removing the execution of future ${event.futureId}`);
  }

  public deploymentExecutionStateInitialize(
    event: DeploymentExecutionStateInitializeEvent
  ): void {
    console.log(`Starting to execute the deployment future ${event.futureId}`);
  }

  public deploymentExecutionStateComplete(
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

  public callExecutionStateInitialize(
    event: CallExecutionStateInitializeEvent
  ): void {
    console.log(`Starting to execute the call future ${event.futureId}`);
  }

  public callExecutionStateComplete(
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

  public staticCallExecutionStateInitialize(
    event: StaticCallExecutionStateInitializeEvent
  ): void {
    console.log(`Starting to execute the static call future ${event.futureId}`);
  }

  public staticCallExecutionStateComplete(
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

  public sendDataExecutionStateInitialize(
    event: SendDataExecutionStateInitializeEvent
  ): void {
    console.log(`Started to execute the send data future ${event.futureId}`);
  }

  public sendDataExecutionStateComplete(
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

  public contractAtExecutionStateInitialize(
    event: ContractAtExecutionStateInitializeEvent
  ): void {
    console.log(`Executed contract at future ${event.futureId}`);
  }

  public readEventArgumentExecutionStateInitialize(
    event: ReadEventArgExecutionStateInitializeEvent
  ): void {
    console.log(
      `Executed read event argument future ${event.futureId} with result ${
        event.result.result ?? "undefined"
      }`
    );
  }

  public networkInteractionRequest(
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

  public transactionSend(event: TransactionSendEvent): void {
    console.log(
      `Transaction ${event.hash} sent for onchain interaction of future ${event.futureId}`
    );
  }

  public transactionConfirm(event: TransactionConfirmEvent): void {
    console.log(`Transaction ${event.hash} confirmed`);
  }

  public staticCallComplete(event: StaticCallCompleteEvent): void {
    console.log(`Static call completed for future ${event.futureId}`);
  }

  public onchainInteractionBumpFees(
    event: OnchainInteractionBumpFeesEvent
  ): void {
    console.log(
      `A transaction with higher fees will be sent for onchain interaction of future ${event.futureId}`
    );
  }

  public onchainInteractionDropped(
    event: OnchainInteractionDroppedEvent
  ): void {
    console.log(
      `Transactions for onchain interaction of future ${event.futureId} has been dropped and will be resent`
    );
  }

  public onchainInteractionReplacedByUser(
    event: OnchainInteractionReplacedByUserEvent
  ): void {
    console.log(
      `Transactions for onchain interaction of future ${event.futureId} has been replaced by the user and the onchain interaction exection will start again`
    );
  }

  public onchainInteractionTimeout(
    event: OnchainInteractionTimeoutEvent
  ): void {
    console.log(
      `Onchain interaction of future ${event.futureId} failed due to being resent too many times and not having confirmed`
    );
  }

  public batchInitialize(event: BatchInitializeEvent): void {
    console.log(
      `Starting execution for batches: ${JSON.stringify(event.batches)}`
    );
  }

  public deploymentStart(_event: DeploymentStartEvent): void {
    console.log(`Starting execution for new deployment`);
  }

  public beginNextBatch(_event: BeginNextBatchEvent): void {
    console.log(`Starting execution for next batch`);
  }

  public deploymentComplete(_event: DeploymentCompleteEvent): void {
    console.log(`Deployment complete`);
  }

  public setModuleId(event: SetModuleIdEvent): void {
    console.log(`Starting validation for module: ${event.moduleName}`);
  }
}
