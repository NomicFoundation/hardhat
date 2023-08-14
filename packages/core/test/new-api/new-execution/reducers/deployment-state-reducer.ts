import { assert } from "chai";

import { deploymentStateReducer } from "../../../../src/new-api/internal/new-execution/reducers/deployment-state-reducer";
import { isDeploymentExecutionState } from "../../../../src/new-api/internal/new-execution/type-guards/execution-state";
import { isOnchainInteraction } from "../../../../src/new-api/internal/new-execution/type-guards/network-interaction";
import { DeploymentState } from "../../../../src/new-api/internal/new-execution/types/deployment-state";
import { TransactionReceiptStatus } from "../../../../src/new-api/internal/new-execution/types/jsonrpc";
import {
  DeploymentExecutionStateInitializeMessage,
  JournalMessage,
  JournalMessageType,
  NetworkInteractionRequestMessage,
  SendTransactionMessage,
  TransactionConfirmMessage,
} from "../../../../src/new-api/internal/new-execution/types/messages";
import { NetworkInteractionType } from "../../../../src/new-api/internal/new-execution/types/network-interaction";
import { assertIgnitionInvariant } from "../../../../src/new-api/internal/utils/assertions";
import { FutureType } from "../../../../src/new-api/types/module";

describe("DeploymentStateReducer", () => {
  const exampleAddress = "0x1F98431c8aD98523631AE4a59f267346ea31F984";

  let initialState: DeploymentState;
  let updatedState: DeploymentState;

  describe("starting a new run", () => {
    beforeEach(() => {
      initialState = deploymentStateReducer(undefined);

      updatedState = deploymentStateReducer(initialState, {
        type: JournalMessageType.RUN_START,
        chainId: 31337,
      });
    });

    it("should set the chainId", () => {
      assert.equal(updatedState.chainId, 31337);
    });

    it("should leave the previous execution states", () => {
      assert.equal(initialState.executionStates, updatedState.executionStates);
    });
  });

  describe("running a named contract deploy", () => {
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

    const sendTransactionMessage: SendTransactionMessage = {
      type: JournalMessageType.TRANSACTION_SEND,
      futureId: "future1",
      networkInteractionId: 1,
      transaction: {
        hash: "0xdeadbeef",
        maxFeePerGas: BigInt(10),
        maxPriorityFeePerGas: BigInt(5),
      },
    };

    const sendAnotherTransactionMessage: SendTransactionMessage = {
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

    describe("initialization", () => {
      beforeEach(() => {
        updatedState = applyMessages([initializeNamedContractDeployMessage]);
      });

      it("should populate a deployment execution state for the future", () => {
        const exState = updatedState.executionStates.future1;
        assert.isDefined(exState);
        assert(isDeploymentExecutionState(exState));
      });
    });

    describe("strategy requesting an onchain interaction", () => {
      beforeEach(() => {
        updatedState = applyMessages([
          initializeNamedContractDeployMessage,
          requestNetworkInteractionMessage,
        ]);
      });

      it("should populate a new onchain interaction", () => {
        const exState = updatedState.executionStates.future1;

        assertIgnitionInvariant(
          isDeploymentExecutionState(exState),
          "has to be a deployment execution state"
        );

        assert.equal(exState.networkInteractions.length, 1);
        const networkInteraction = exState.networkInteractions[0];

        assert.isDefined(networkInteraction);
        assert.deepStrictEqual(
          requestNetworkInteractionMessage.networkInteraction,
          networkInteraction
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
      });

      it("should populate the transaction against the network interaction", () => {
        const exState = updatedState.executionStates.future1;

        assertIgnitionInvariant(
          isDeploymentExecutionState(exState),
          "has to be a deployment execution state"
        );

        assert.equal(exState.networkInteractions.length, 1);
        const networkInteraction = exState.networkInteractions[0];

        assert.isDefined(networkInteraction);

        assertIgnitionInvariant(
          isOnchainInteraction(networkInteraction),
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
      });

      it("should set the receipt against the successful transaction", () => {
        const exState = updatedState.executionStates.future1;

        assertIgnitionInvariant(
          isDeploymentExecutionState(exState),
          "has to be a deployment execution state"
        );

        assert.equal(exState.networkInteractions.length, 1);
        const networkInteraction = exState.networkInteractions[0];

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
        const exState = updatedState.executionStates.future1;

        assertIgnitionInvariant(
          isDeploymentExecutionState(exState),
          "has to be a deployment execution state"
        );

        assert.equal(exState.networkInteractions.length, 1);
        const networkInteraction = exState.networkInteractions[0];

        assert.isDefined(networkInteraction);

        assertIgnitionInvariant(
          isOnchainInteraction(networkInteraction),
          "has to be an onchain interaction"
        );

        assert.equal(networkInteraction.transactions.length, 1);
      });
    });
  });
});

function applyMessages(messages: JournalMessage[]) {
  const initialState = deploymentStateReducer(undefined);

  return messages.reduce(deploymentStateReducer, initialState);
}
