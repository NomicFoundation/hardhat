import { assert } from "chai";

import { deploymentStateReducer } from "../../../../src/new-api/internal/new-execution/reducers/deployment-state-reducer";
import { isOnchainInteraction } from "../../../../src/new-api/internal/new-execution/type-guards/network-interaction";
import { DeploymentState } from "../../../../src/new-api/internal/new-execution/types/deployment-state";
import { ExecutionResultType } from "../../../../src/new-api/internal/new-execution/types/execution-result";
import {
  DeploymentExecutionState,
  ExecutionSateType,
  ExecutionStatus,
} from "../../../../src/new-api/internal/new-execution/types/execution-state";
import { TransactionReceiptStatus } from "../../../../src/new-api/internal/new-execution/types/jsonrpc";
import {
  DeploymentExecutionStateCompleteMessage,
  DeploymentExecutionStateInitializeMessage,
  JournalMessage,
  JournalMessageType,
  NetworkInteractionRequestMessage,
  TransactionConfirmMessage,
  TransactionSendMessage,
} from "../../../../src/new-api/internal/new-execution/types/messages";
import { NetworkInteractionType } from "../../../../src/new-api/internal/new-execution/types/network-interaction";
import { assertIgnitionInvariant } from "../../../../src/new-api/internal/utils/assertions";
import { FutureType } from "../../../../src/new-api/types/module";

describe("DeploymentStateReducer", () => {
  describe("running a named contract deploy", () => {
    const exampleAddress = "0x1F98431c8aD98523631AE4a59f267346ea31F984";

    let updatedState: DeploymentState;
    let updatedDepExState: DeploymentExecutionState;

    const initializeNamedContractDeployMessage: DeploymentExecutionStateInitializeMessage =
      {
        type: JournalMessageType.DEPLOYMENT_EXECUTION_STATE_INITIALIZE,
        futureId: "future1",
        futureType: FutureType.NAMED_CONTRACT_DEPLOYMENT,
        strategy: "basic",
        dependencies: [],
        artifactFutureId: "future1",
        contractName: "MyContract",
        constructorArgs: [],
        libraries: {},
        value: BigInt(0),
        from: undefined,
      };

    const requestNetworkInteractionMessage: NetworkInteractionRequestMessage = {
      type: JournalMessageType.NETWORK_INTERACTION_REQUEST,
      futureId: "future1",
      networkInteraction: {
        id: 1,
        type: NetworkInteractionType.ONCHAIN_INTERACTION,
        to: undefined,
        data: "fake-data",
        value: BigInt(0),
        from: "string",
        transactions: [],
      },
    };

    const sendTransactionMessage: TransactionSendMessage = {
      type: JournalMessageType.TRANSACTION_SEND,
      futureId: "future1",
      networkInteractionId: 1,
      transaction: {
        hash: "0xdeadbeef",
        maxFeePerGas: BigInt(10),
        maxPriorityFeePerGas: BigInt(5),
      },
    };

    const sendAnotherTransactionMessage: TransactionSendMessage = {
      type: JournalMessageType.TRANSACTION_SEND,
      futureId: "future1",
      networkInteractionId: 1,
      transaction: {
        hash: "0xanother",
        maxFeePerGas: BigInt(20),
        maxPriorityFeePerGas: BigInt(10),
      },
    };

    const confirmTransactionMessage: TransactionConfirmMessage = {
      type: JournalMessageType.TRANSACTION_CONFIRM,
      futureId: "future1",
      networkInteractionId: 1,
      hash: "0xdeadbeef",
      receipt: {
        blockHash: "0xblockhash",
        blockNumber: 0,
        contractAddress: exampleAddress,
        status: TransactionReceiptStatus.SUCCESS,
        logs: [],
      },
    };

    const deploymentSuccessMessage: DeploymentExecutionStateCompleteMessage = {
      type: JournalMessageType.DEPLOYMENT_EXECUTION_STATE_COMPLETE,
      futureId: "future1",
      result: {
        type: ExecutionResultType.SUCCESS,
        address: exampleAddress,
      },
    };

    const deploymentFailsWithRevertMessage: DeploymentExecutionStateCompleteMessage =
      {
        type: JournalMessageType.DEPLOYMENT_EXECUTION_STATE_COMPLETE,
        futureId: "future1",
        result: {
          type: ExecutionResultType.REVERTED_TRANSACTION,
        },
      };

    describe("initialization", () => {
      beforeEach(() => {
        updatedState = applyMessages([initializeNamedContractDeployMessage]);
      });

      it("should populate a deployment execution state for the future", () => {
        const exState = updatedState.executionStates.future1;

        assert.equal(
          exState?.type,
          ExecutionSateType.DEPLOYMENT_EXECUTION_STATE
        );
      });
    });

    describe("strategy requesting an onchain interaction", () => {
      beforeEach(() => {
        updatedState = applyMessages([
          initializeNamedContractDeployMessage,
          requestNetworkInteractionMessage,
        ]);

        updatedDepExState = lookupDepExState(updatedState, "future1");
      });

      it("should populate a new onchain interaction", () => {
        assert.equal(updatedDepExState.networkInteractions.length, 1);

        assert.deepStrictEqual(
          updatedDepExState.networkInteractions[0],
          requestNetworkInteractionMessage.networkInteraction
        );
      });
    });

    describe("execution engine sends transaction", () => {
      beforeEach(() => {
        updatedState = applyMessages([
          initializeNamedContractDeployMessage,
          requestNetworkInteractionMessage,
          sendTransactionMessage,
        ]);

        updatedDepExState = lookupDepExState(updatedState, "future1");
      });

      it("should populate the transaction against the network interaction", () => {
        assert.equal(updatedDepExState.networkInteractions.length, 1);
        const networkInteraction = updatedDepExState.networkInteractions[0];

        assertIgnitionInvariant(
          networkInteraction.type ===
            NetworkInteractionType.ONCHAIN_INTERACTION,
          "has to be an onchain interaction"
        );

        assert.equal(networkInteraction.transactions.length, 1);
        const transaction = networkInteraction.transactions[0];

        assert.isDefined(transaction);
        assert.deepStrictEqual(sendTransactionMessage.transaction, transaction);
      });
    });

    describe("transaction confirms successfully", () => {
      beforeEach(() => {
        updatedState = applyMessages([
          initializeNamedContractDeployMessage,
          requestNetworkInteractionMessage,
          sendTransactionMessage,
          sendAnotherTransactionMessage,
          confirmTransactionMessage,
        ]);

        updatedDepExState = lookupDepExState(updatedState, "future1");
      });

      it("should set the receipt against the successful transaction", () => {
        assert.equal(updatedDepExState.networkInteractions.length, 1);
        const networkInteraction = updatedDepExState.networkInteractions[0];

        assert.isDefined(networkInteraction);

        assertIgnitionInvariant(
          isOnchainInteraction(networkInteraction),
          "has to be an onchain interaction"
        );

        const transaction = networkInteraction.transactions.find(
          (tx) => tx.hash === "0xdeadbeef"
        );

        assertIgnitionInvariant(transaction !== undefined, "tx not found");

        assert.deepStrictEqual(
          transaction.receipt,
          confirmTransactionMessage.receipt
        );
      });

      it("should clear all other transactions for the network interaction", () => {
        assert.equal(updatedDepExState.networkInteractions.length, 1);
        const networkInteraction = updatedDepExState.networkInteractions[0];

        assert.isDefined(networkInteraction);

        assertIgnitionInvariant(
          isOnchainInteraction(networkInteraction),
          "has to be an onchain interaction"
        );

        assert.equal(networkInteraction.transactions.length, 1);
      });
    });

    describe("deployment completes successfully", () => {
      beforeEach(() => {
        updatedState = applyMessages([
          initializeNamedContractDeployMessage,
          requestNetworkInteractionMessage,
          sendTransactionMessage,
          sendAnotherTransactionMessage,
          confirmTransactionMessage,
          deploymentSuccessMessage,
        ]);

        updatedDepExState = lookupDepExState(updatedState, "future1");
      });

      it("should set the result against the execution state", () => {
        assert.deepStrictEqual(updatedDepExState.result, {
          type: ExecutionResultType.SUCCESS,
          address: exampleAddress,
        });
      });

      it("should update the status to success", () => {
        assert.deepStrictEqual(
          updatedDepExState.status,
          ExecutionStatus.SUCCESS
        );
      });
    });

    describe("deployment errors on a revert", () => {
      beforeEach(() => {
        updatedState = applyMessages([
          initializeNamedContractDeployMessage,
          requestNetworkInteractionMessage,
          sendTransactionMessage,
          sendAnotherTransactionMessage,
          confirmTransactionMessage,
          deploymentFailsWithRevertMessage,
        ]);

        updatedDepExState = lookupDepExState(updatedState, "future1");
      });

      it("should set the result as a revert", () => {
        assert.deepStrictEqual(updatedDepExState.result, {
          type: ExecutionResultType.REVERTED_TRANSACTION,
        });
      });

      it("should update the status to failed", () => {
        assert.equal(updatedDepExState.status, ExecutionStatus.FAILED);
      });
    });
  });
});

function applyMessages(messages: JournalMessage[]) {
  const initialState = deploymentStateReducer(undefined);

  return messages.reduce(deploymentStateReducer, initialState);
}

function lookupDepExState(state: DeploymentState, futureId: string) {
  const depExState = state.executionStates[futureId];

  assertIgnitionInvariant(
    depExState.type === ExecutionSateType.DEPLOYMENT_EXECUTION_STATE,
    "has to be a deployment execution state"
  );

  return depExState;
}
