import { assert } from "chai";

import { NamedContractDeploymentFuture } from "../../../../src";
import { MemoryJournal } from "../../../../src/new-api/internal/journal/memory-journal";
import { NamedContractDeploymentFutureImplementation } from "../../../../src/new-api/internal/module";
import { BasicExecutionStrategy } from "../../../../src/new-api/internal/new-execution/basic-execution-strategy";
import { FutureProcessor } from "../../../../src/new-api/internal/new-execution/future-processor/future-processor";
import { deploymentStateReducer } from "../../../../src/new-api/internal/new-execution/reducers/deployment-state-reducer";
import { TransactionTrackingTimer } from "../../../../src/new-api/internal/new-execution/transaction-tracking-timer";
import {
  exampleAccounts,
  setupMockArtifactResolver,
  setupMockDeploymentLoader,
} from "../../helpers";

describe("future processor", () => {
  describe("deploying a named contract", () => {
    const exampleAddress = "0x1F98431c8aD98523631AE4a59f267346ea31F984";
    // const differentAddress = "0xBA12222222228d8Ba445958a75a0704d566BF2C8";

    it.skip("should deploy a named contract", async () => {
      const initialDeploymentState = deploymentStateReducer(undefined);
      const mockDeploymentLoader = setupMockDeploymentLoader(
        new MemoryJournal()
      );
      const mockArtifactResolver = setupMockArtifactResolver();

      const deploymentFuture: NamedContractDeploymentFuture<string> =
        new NamedContractDeploymentFutureImplementation(
          "MyModule:TestContract",
          {} as any,
          "MyModule",
          [],
          {},
          BigInt(0),
          exampleAddress
        );

      // const firstStrategyRun = true;
      // const mockNextActionDispatch = async (
      //   futureId: string,
      //   nextAction: NextAction
      // ): Promise<JournalMessage> => {
      //   switch (nextAction) {
      //     case NextAction.RUN_STRATEGY: {
      //       if (firstStrategyRun) {
      //         const requestNetworkInteractionMessage: NetworkInteractionRequestMessage =
      //           {
      //             type: JournalMessageType.NETWORK_INTERACTION_REQUEST,
      //             futureId,
      //             networkInteraction: {
      //               id: 1,
      //               type: NetworkInteractionType.ONCHAIN_INTERACTION,
      //               to: undefined,
      //               data: "fake-data",
      //               value: BigInt(0),
      //               from: differentAddress,
      //             },
      //           };

      //         firstStrategyRun = false;

      //         return requestNetworkInteractionMessage;
      //       }

      //       const deploymentSuccessMessage: DeploymentExecutionStateCompleteMessage =
      //         {
      //           type: JournalMessageType.DEPLOYMENT_EXECUTION_STATE_COMPLETE,
      //           futureId,
      //           result: {
      //             type: ExecutionResultType.SUCCESS,
      //             address: exampleAddress,
      //           },
      //         };

      //       return deploymentSuccessMessage;
      //     }
      //     case NextAction.SEND_TRANSACTION: {
      //       const transactionSentMessage: TransactionSendMessage = {
      //         type: JournalMessageType.TRANSACTION_SEND,
      //         futureId,
      //         networkInteractionId: 1,
      //         transaction: {
      //           hash: "0xdeadbeef",
      //           fees: {
      //             maxPriorityFeePerGas: BigInt(100),
      //             maxFeePerGas: BigInt(10),
      //           },
      //         },
      //         nonce: 0,
      //       };

      //       return transactionSentMessage;
      //     }
      //     case NextAction.MONITOR_ONCHAIN_INTERACTION: {
      //       const confirmTransactionMessage: TransactionConfirmMessage = {
      //         type: JournalMessageType.TRANSACTION_CONFIRM,
      //         futureId,
      //         networkInteractionId: 1,
      //         hash: "0xdeadbeef",
      //         receipt: {
      //           blockHash: "0xblockhash",
      //           blockNumber: 0,
      //           contractAddress: exampleAddress,
      //           status: TransactionReceiptStatus.SUCCESS,
      //           logs: [],
      //         },
      //       };

      //       return confirmTransactionMessage;
      //     }
      //     case NextAction.QUERY_STATIC_CALL: {
      //       throw new Error("TBD");
      //     }
      //   }
      // };

      const basicExecutionStrategy = new BasicExecutionStrategy(
        mockDeploymentLoader.loadArtifact
      );

      const stub = {} as any;

      const transactionTrackingTimer = new TransactionTrackingTimer();

      const mockNonceManager = {} as any;

      const processor = new FutureProcessor(
        mockDeploymentLoader,
        mockArtifactResolver,
        basicExecutionStrategy,
        stub,
        transactionTrackingTimer,
        mockNonceManager,
        1,
        10,
        100,
        exampleAccounts,
        {}
      );

      const result = await processor.processFuture(
        deploymentFuture,
        initialDeploymentState
      );

      assert.isTrue(result.futureCompleted);
    });
  });
});
