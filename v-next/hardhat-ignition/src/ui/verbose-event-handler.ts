import {
  BatchInitializeEvent,
  BeginNextBatchEvent,
  CallExecutionStateCompleteEvent,
  CallExecutionStateInitializeEvent,
  ContractAtExecutionStateInitializeEvent,
  DeploymentCompleteEvent,
  DeploymentExecutionStateCompleteEvent,
  DeploymentExecutionStateInitializeEvent,
  DeploymentInitializeEvent,
  DeploymentStartEvent,
  EncodeFunctionCallExecutionStateInitializeEvent,
  ExecutionEventListener,
  ExecutionEventNetworkInteractionType,
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
  SetStrategyEvent,
  StaticCallCompleteEvent,
  StaticCallExecutionStateCompleteEvent,
  StaticCallExecutionStateInitializeEvent,
  TransactionConfirmEvent,
  TransactionSendEvent,
  WipeApplyEvent,
} from "@ignored/hardhat-vnext-ignition-core";

export class VerboseEventHandler implements ExecutionEventListener {
  public deploymentInitialize(event: DeploymentInitializeEvent): void {
    console.log(`Deployment initialized for chainId: ${event.chainId}`);
  }

  public wipeApply(event: WipeApplyEvent): void {
    console.log(`Removing the execution of future ${event.futureId}`);
  }

  public deploymentExecutionStateInitialize(
    event: DeploymentExecutionStateInitializeEvent,
  ): void {
    console.log(`Starting to execute the deployment future ${event.futureId}`);
  }

  public deploymentExecutionStateComplete(
    event: DeploymentExecutionStateCompleteEvent,
  ): void {
    switch (event.result.type) {
      case ExecutionEventResultType.SUCCESS: {
        return console.log(
          `Successfully completed the execution of deployment future ${
            event.futureId
          } with address ${event.result.result ?? "undefined"}`,
        );
      }
      case ExecutionEventResultType.ERROR: {
        return console.log(
          `Execution of future ${event.futureId} failed with reason: ${event.result.error}`,
        );
      }
      case ExecutionEventResultType.HELD: {
        return console.log(
          `Execution of future ${event.futureId}/${event.result.heldId} held with reason: ${event.result.reason}`,
        );
      }
    }
  }

  public callExecutionStateInitialize(
    event: CallExecutionStateInitializeEvent,
  ): void {
    console.log(`Starting to execute the call future ${event.futureId}`);
  }

  public callExecutionStateComplete(
    event: CallExecutionStateCompleteEvent,
  ): void {
    switch (event.result.type) {
      case ExecutionEventResultType.SUCCESS: {
        return console.log(
          `Successfully completed the execution of call future ${event.futureId}`,
        );
      }
      case ExecutionEventResultType.ERROR: {
        return console.log(
          `Execution of call future ${event.futureId} failed with reason: ${event.result.error}`,
        );
      }
      case ExecutionEventResultType.HELD: {
        return console.log(
          `Execution of call future ${event.futureId}/${event.result.heldId} held with reason: ${event.result.reason}`,
        );
      }
    }
  }

  public staticCallExecutionStateInitialize(
    event: StaticCallExecutionStateInitializeEvent,
  ): void {
    console.log(`Starting to execute the static call future ${event.futureId}`);
  }

  public staticCallExecutionStateComplete(
    event: StaticCallExecutionStateCompleteEvent,
  ): void {
    switch (event.result.type) {
      case ExecutionEventResultType.SUCCESS: {
        return console.log(
          `Successfully completed the execution of static call future ${
            event.futureId
          } with result ${event.result.result ?? "undefined"}`,
        );
      }
      case ExecutionEventResultType.ERROR: {
        return console.log(
          `Execution of static call future ${event.futureId} failed with reason: ${event.result.error}`,
        );
      }
      case ExecutionEventResultType.HELD: {
        return console.log(
          `Execution of static call future ${event.futureId}/${event.result.heldId} held with reason: ${event.result.reason}`,
        );
      }
    }
  }

  public sendDataExecutionStateInitialize(
    event: SendDataExecutionStateInitializeEvent,
  ): void {
    console.log(`Started to execute the send data future ${event.futureId}`);
  }

  public sendDataExecutionStateComplete(
    event: SendDataExecutionStateCompleteEvent,
  ): void {
    switch (event.result.type) {
      case ExecutionEventResultType.SUCCESS: {
        return console.log(
          `Successfully completed the execution of send data future ${
            event.futureId
          } in tx ${event.result.result ?? "undefined"}`,
        );
      }
      case ExecutionEventResultType.ERROR: {
        return console.log(
          `Execution of future ${event.futureId} failed with reason: ${event.result.error}`,
        );
      }
      case ExecutionEventResultType.HELD: {
        return console.log(
          `Execution of send future ${event.futureId}/${event.result.heldId} held with reason: ${event.result.reason}`,
        );
      }
    }
  }

  public contractAtExecutionStateInitialize(
    event: ContractAtExecutionStateInitializeEvent,
  ): void {
    console.log(`Executed contract at future ${event.futureId}`);
  }

  public readEventArgumentExecutionStateInitialize(
    event: ReadEventArgExecutionStateInitializeEvent,
  ): void {
    console.log(
      `Executed read event argument future ${event.futureId} with result ${
        event.result.result ?? "undefined"
      }`,
    );
  }

  public encodeFunctionCallExecutionStateInitialize(
    event: EncodeFunctionCallExecutionStateInitializeEvent,
  ): void {
    console.log(
      `Executed encode function call future ${event.futureId} with result ${
        event.result.result ?? "undefined"
      }`,
    );
  }

  public networkInteractionRequest(
    event: NetworkInteractionRequestEvent,
  ): void {
    if (
      event.networkInteractionType ===
      ExecutionEventNetworkInteractionType.ONCHAIN_INTERACTION
    ) {
      console.log(
        `New onchain interaction requested for future ${event.futureId}`,
      );
    } else {
      console.log(`New static call requested for future ${event.futureId}`);
    }
  }

  public transactionSend(event: TransactionSendEvent): void {
    console.log(
      `Transaction ${event.hash} sent for onchain interaction of future ${event.futureId}`,
    );
  }

  public transactionConfirm(event: TransactionConfirmEvent): void {
    console.log(`Transaction ${event.hash} confirmed`);
  }

  public staticCallComplete(event: StaticCallCompleteEvent): void {
    console.log(`Static call completed for future ${event.futureId}`);
  }

  public onchainInteractionBumpFees(
    event: OnchainInteractionBumpFeesEvent,
  ): void {
    console.log(
      `A transaction with higher fees will be sent for onchain interaction of future ${event.futureId}`,
    );
  }

  public onchainInteractionDropped(
    event: OnchainInteractionDroppedEvent,
  ): void {
    console.log(
      `Transactions for onchain interaction of future ${event.futureId} has been dropped and will be resent`,
    );
  }

  public onchainInteractionReplacedByUser(
    event: OnchainInteractionReplacedByUserEvent,
  ): void {
    console.log(
      `Transactions for onchain interaction of future ${event.futureId} has been replaced by the user and the onchain interaction exection will start again`,
    );
  }

  public onchainInteractionTimeout(
    event: OnchainInteractionTimeoutEvent,
  ): void {
    console.log(
      `Onchain interaction of future ${event.futureId} failed due to being resent too many times and not having confirmed`,
    );
  }

  public batchInitialize(event: BatchInitializeEvent): void {
    console.log(
      `Starting execution for batches: ${JSON.stringify(event.batches)}`,
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

  public reconciliationWarnings(event: ReconciliationWarningsEvent): void {
    console.log(
      `Deployment produced reconciliation warnings:\n${event.warnings.join(
        "  -",
      )}`,
    );
  }

  public setModuleId(event: SetModuleIdEvent): void {
    console.log(`Starting validation for module: ${event.moduleName}`);
  }

  public setStrategy(event: SetStrategyEvent): void {
    console.log(`Starting execution with strategy: ${event.strategy}`);
  }

  public runStart(_event: RunStartEvent): void {
    console.log("Execution run starting");
  }
}
