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
  DeploymentStartEvent,
  EncodeFunctionCallExecutionStateInitializeEvent,
  ExecutionEventListener,
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

import {
  ExecutionEventNetworkInteractionType,
  ExecutionEventResultType,
} from "@nomicfoundation/ignition-core";

export class VerboseEventHandler implements ExecutionEventListener {
  public async deploymentInitialize(
    event: DeploymentInitializeEvent,
  ): Promise<void> {
    console.log(`Deployment initialized for chainId: ${event.chainId}`);
  }

  public async wipeApply(event: WipeApplyEvent): Promise<void> {
    console.log(`Removing the execution of future ${event.futureId}`);
  }

  public async deploymentExecutionStateInitialize(
    event: DeploymentExecutionStateInitializeEvent,
  ): Promise<void> {
    console.log(`Starting to execute the deployment future ${event.futureId}`);
  }

  public async deploymentExecutionStateComplete(
    event: DeploymentExecutionStateCompleteEvent,
  ): Promise<void> {
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

  public async callExecutionStateInitialize(
    event: CallExecutionStateInitializeEvent,
  ): Promise<void> {
    console.log(`Starting to execute the call future ${event.futureId}`);
  }

  public async callExecutionStateComplete(
    event: CallExecutionStateCompleteEvent,
  ): Promise<void> {
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

  public async staticCallExecutionStateInitialize(
    event: StaticCallExecutionStateInitializeEvent,
  ): Promise<void> {
    console.log(`Starting to execute the static call future ${event.futureId}`);
  }

  public async staticCallExecutionStateComplete(
    event: StaticCallExecutionStateCompleteEvent,
  ): Promise<void> {
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

  public async sendDataExecutionStateInitialize(
    event: SendDataExecutionStateInitializeEvent,
  ): Promise<void> {
    console.log(`Started to execute the send data future ${event.futureId}`);
  }

  public async sendDataExecutionStateComplete(
    event: SendDataExecutionStateCompleteEvent,
  ): Promise<void> {
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

  public async contractAtExecutionStateInitialize(
    event: ContractAtExecutionStateInitializeEvent,
  ): Promise<void> {
    console.log(`Executed contract at future ${event.futureId}`);
  }

  public async readEventArgumentExecutionStateInitialize(
    event: ReadEventArgExecutionStateInitializeEvent,
  ): Promise<void> {
    console.log(
      `Executed read event argument future ${event.futureId} with result ${
        event.result.result ?? "undefined"
      }`,
    );
  }

  public async encodeFunctionCallExecutionStateInitialize(
    event: EncodeFunctionCallExecutionStateInitializeEvent,
  ): Promise<void> {
    console.log(
      `Executed encode function call future ${event.futureId} with result ${
        event.result.result ?? "undefined"
      }`,
    );
  }

  public async networkInteractionRequest(
    event: NetworkInteractionRequestEvent,
  ): Promise<void> {
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

  public async transactionPrepareSend(
    event: TransactionPrepareSendEvent,
  ): Promise<void> {
    console.log(
      `Transaction about to be sent for onchain interaction of future ${event.futureId}`,
    );
  }

  public async transactionSend(event: TransactionSendEvent): Promise<void> {
    console.log(
      `Transaction ${event.hash} sent for onchain interaction of future ${event.futureId}`,
    );
  }

  public async transactionConfirm(
    event: TransactionConfirmEvent,
  ): Promise<void> {
    console.log(`Transaction ${event.hash} confirmed`);
  }

  public async staticCallComplete(
    event: StaticCallCompleteEvent,
  ): Promise<void> {
    console.log(`Static call completed for future ${event.futureId}`);
  }

  public async onchainInteractionBumpFees(
    event: OnchainInteractionBumpFeesEvent,
  ): Promise<void> {
    console.log(
      `A transaction with higher fees will be sent for onchain interaction of future ${event.futureId}`,
    );
  }

  public async onchainInteractionDropped(
    event: OnchainInteractionDroppedEvent,
  ): Promise<void> {
    console.log(
      `Transactions for onchain interaction of future ${event.futureId} has been dropped and will be resent`,
    );
  }

  public async onchainInteractionReplacedByUser(
    event: OnchainInteractionReplacedByUserEvent,
  ): Promise<void> {
    console.log(
      `Transactions for onchain interaction of future ${event.futureId} has been replaced by the user and the onchain interaction execution will start again`,
    );
  }

  public async onchainInteractionTimeout(
    event: OnchainInteractionTimeoutEvent,
  ): Promise<void> {
    console.log(
      `Onchain interaction of future ${event.futureId} failed due to being resent too many times and not having confirmed`,
    );
  }

  public async batchInitialize(event: BatchInitializeEvent): Promise<void> {
    console.log(
      `Starting execution for batches: ${JSON.stringify(event.batches)}`,
    );
  }

  public async deploymentStart(_event: DeploymentStartEvent): Promise<void> {
    console.log(`Starting execution for new deployment`);
  }

  public async beginNextBatch(_event: BeginNextBatchEvent): Promise<void> {
    console.log(`Starting execution for next batch`);
  }

  public async deploymentComplete(
    _event: DeploymentCompleteEvent,
  ): Promise<void> {
    console.log(`Deployment complete`);
  }

  public async reconciliationWarnings(
    event: ReconciliationWarningsEvent,
  ): Promise<void> {
    console.log(
      `Deployment produced reconciliation warnings:\n${event.warnings.join(
        "  -",
      )}`,
    );
  }

  public async setModuleId(event: SetModuleIdEvent): Promise<void> {
    console.log(`Starting validation for module: ${event.moduleName}`);
  }

  public async setStrategy(event: SetStrategyEvent): Promise<void> {
    console.log(`Starting execution with strategy: ${event.strategy}`);
  }

  public async runStart(_event: RunStartEvent): Promise<void> {
    console.log("Execution run starting");
  }
}
