import { assert } from "chai";

import { DeploymentState } from "../../../../src/new-api/internal/new-execution/types/deployment-state";
import { EvmExecutionResultTypes } from "../../../../src/new-api/internal/new-execution/types/evm-execution";
import { ExecutionResultType } from "../../../../src/new-api/internal/new-execution/types/execution-result";
import {
  ExecutionSateType,
  ExecutionStatus,
  SendDataExecutionState,
} from "../../../../src/new-api/internal/new-execution/types/execution-state";
import { TransactionReceiptStatus } from "../../../../src/new-api/internal/new-execution/types/jsonrpc";
import {
  JournalMessageType,
  NetworkInteractionRequestMessage,
  SendDataExecutionStateCompleteMessage,
  SendDataExecutionStateInitializeMessage,
  TransactionConfirmMessage,
  TransactionSendMessage,
} from "../../../../src/new-api/internal/new-execution/types/messages";
import { NetworkInteractionType } from "../../../../src/new-api/internal/new-execution/types/network-interaction";
import { findOnchainInteractionBy } from "../../../../src/new-api/internal/new-execution/views/execution-state/find-onchain-interaction-by";
import { findTransactionBy } from "../../../../src/new-api/internal/new-execution/views/execution-state/find-transaction-by";
import { findExecutionStateById } from "../../../../src/new-api/internal/new-execution/views/find-execution-state-by-id";
import { assertIgnitionInvariant } from "../../../../src/new-api/internal/utils/assertions";

import { applyMessages } from "./utils";

describe("DeploymentStateReducer", () => {
  describe("running a named library deploy", () => {
    const exampleAddress = "0x1F98431c8aD98523631AE4a59f267346ea31F984";
    const differentAddress = "0xBA12222222228d8Ba445958a75a0704d566BF2C8";

    let updatedDeploymentState: DeploymentState;
    let updatedSendDataExState: SendDataExecutionState;

    const initializeSendDataExecutionStateMessage: SendDataExecutionStateInitializeMessage =
      {
        type: JournalMessageType.SEND_DATA_EXECUTION_STATE_INITIALIZE,
        futureId: "SendData1",
        strategy: "basic",
        dependencies: [],
        to: exampleAddress,
        data: "fake-data",
        value: BigInt(0),
        from: undefined,
      };

    const requestNetworkInteractionMessage: NetworkInteractionRequestMessage = {
      type: JournalMessageType.NETWORK_INTERACTION_REQUEST,
      futureId: "SendData1",
      networkInteraction: {
        id: 1,
        type: NetworkInteractionType.ONCHAIN_INTERACTION,
        to: undefined,
        data: "fake-data",
        value: BigInt(0),
        from: differentAddress,
      },
    };

    const sendTransactionMessage: TransactionSendMessage = {
      type: JournalMessageType.TRANSACTION_SEND,
      futureId: "SendData1",
      networkInteractionId: 1,
      transaction: {
        hash: "0xdeadbeef",
        fees: {
          maxFeePerGas: BigInt(10),
          maxPriorityFeePerGas: BigInt(5),
        },
      },
    };

    const sendAnotherTransactionMessage: TransactionSendMessage = {
      type: JournalMessageType.TRANSACTION_SEND,
      futureId: "SendData1",
      networkInteractionId: 1,
      transaction: {
        hash: "0xanother",
        fees: {
          maxFeePerGas: BigInt(20),
          maxPriorityFeePerGas: BigInt(10),
        },
      },
    };

    const confirmTransactionMessage: TransactionConfirmMessage = {
      type: JournalMessageType.TRANSACTION_CONFIRM,
      futureId: "SendData1",
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

    const revertedTransactionMessage: TransactionConfirmMessage = {
      type: JournalMessageType.TRANSACTION_CONFIRM,
      futureId: "SendData1",
      networkInteractionId: 1,
      hash: "0xdeadbeef",
      receipt: {
        blockHash: "0xblockhash",
        blockNumber: 0,
        contractAddress: undefined,
        status: TransactionReceiptStatus.FAILURE,
        logs: [],
      },
    };

    const sendDataSuccessMessage: SendDataExecutionStateCompleteMessage = {
      type: JournalMessageType.SEND_DATA_EXECUTION_STATE_COMPLETE,
      futureId: "SendData1",
      result: {
        type: ExecutionResultType.SUCCESS,
      },
    };

    const sendDataFailsWithRevertMessage: SendDataExecutionStateCompleteMessage =
      {
        type: JournalMessageType.SEND_DATA_EXECUTION_STATE_COMPLETE,
        futureId: "SendData1",
        result: {
          type: ExecutionResultType.REVERTED_TRANSACTION,
        },
      };

    const sendDataFailOnStrategyError: SendDataExecutionStateCompleteMessage = {
      type: JournalMessageType.SEND_DATA_EXECUTION_STATE_COMPLETE,
      futureId: "SendData1",
      result: {
        type: ExecutionResultType.STRATEGY_ERROR,
        error: `Transaction 0xdeadbeaf confirmed but something went wrong`,
      },
    };

    const sendDataFailOnSimulationError: SendDataExecutionStateCompleteMessage =
      {
        type: JournalMessageType.SEND_DATA_EXECUTION_STATE_COMPLETE,
        futureId: "SendData1",
        result: {
          type: ExecutionResultType.SIMULATION_ERROR,
          error: {
            type: EvmExecutionResultTypes.REVERT_WITH_REASON,
            message: "Not a valid parameter value",
          },
        },
      };

    describe("initialization", () => {
      beforeEach(() => {
        updatedDeploymentState = applyMessages([
          initializeSendDataExecutionStateMessage,
        ]);

        updatedSendDataExState = findExecutionStateById(
          ExecutionSateType.SEND_DATA_EXECUTION_STATE,
          updatedDeploymentState,
          "SendData1"
        );
      });

      it("should populate a call execution state for the future", () => {
        assert.equal(
          updatedSendDataExState.type,
          ExecutionSateType.SEND_DATA_EXECUTION_STATE
        );
      });
    });

    describe("strategy requesting an onchain interaction", () => {
      beforeEach(() => {
        updatedDeploymentState = applyMessages([
          initializeSendDataExecutionStateMessage,
          requestNetworkInteractionMessage,
        ]);

        updatedSendDataExState = findExecutionStateById(
          ExecutionSateType.SEND_DATA_EXECUTION_STATE,
          updatedDeploymentState,
          "SendData1"
        );
      });

      it("should populate a new onchain interaction", () => {
        assert.equal(updatedSendDataExState.networkInteractions.length, 1);

        const networkInteraction =
          updatedSendDataExState.networkInteractions[0];

        assertIgnitionInvariant(
          networkInteraction.type ===
            NetworkInteractionType.ONCHAIN_INTERACTION,
          "Added Network interaction is of the wrong type "
        );

        const { transactions, ...rest } = networkInteraction;

        assert.deepStrictEqual(
          rest,
          requestNetworkInteractionMessage.networkInteraction
        );
        assert.isDefined(transactions);
      });
    });

    describe("execution engine sends transaction", () => {
      beforeEach(() => {
        updatedDeploymentState = applyMessages([
          initializeSendDataExecutionStateMessage,
          requestNetworkInteractionMessage,
          sendTransactionMessage,
        ]);

        updatedSendDataExState = findExecutionStateById(
          ExecutionSateType.SEND_DATA_EXECUTION_STATE,
          updatedDeploymentState,
          "SendData1"
        );
      });

      it("should populate the transaction against the network interaction", () => {
        const networkInteraction = findOnchainInteractionBy(
          updatedSendDataExState,
          1
        );

        assert.equal(networkInteraction.transactions.length, 1);

        const transaction = findTransactionBy(
          updatedSendDataExState,
          1,
          "0xdeadbeef"
        );

        assert.deepStrictEqual(sendTransactionMessage.transaction, transaction);
      });
    });

    describe("transaction confirms successfully", () => {
      beforeEach(() => {
        updatedDeploymentState = applyMessages([
          initializeSendDataExecutionStateMessage,
          requestNetworkInteractionMessage,
          sendTransactionMessage,
          sendAnotherTransactionMessage,
          confirmTransactionMessage,
        ]);

        updatedSendDataExState = findExecutionStateById(
          ExecutionSateType.SEND_DATA_EXECUTION_STATE,
          updatedDeploymentState,
          "SendData1"
        );
      });

      it("should set the receipt against the successful transaction", () => {
        const transaction = findTransactionBy(
          updatedSendDataExState,
          1,
          "0xdeadbeef"
        );

        assert.deepStrictEqual(
          transaction.receipt,
          confirmTransactionMessage.receipt
        );
      });

      it("should clear all other transactions for the network interaction", () => {
        const networkInteraction = findOnchainInteractionBy(
          updatedSendDataExState,
          1
        );

        assert.equal(networkInteraction.transactions.length, 1);
      });
    });

    describe("transaction confirms but is an error", () => {
      beforeEach(() => {
        updatedDeploymentState = applyMessages([
          initializeSendDataExecutionStateMessage,
          requestNetworkInteractionMessage,
          sendTransactionMessage,
          sendAnotherTransactionMessage,
          revertedTransactionMessage,
        ]);

        updatedSendDataExState = findExecutionStateById(
          ExecutionSateType.SEND_DATA_EXECUTION_STATE,
          updatedDeploymentState,
          "SendData1"
        );
      });

      it("should set the receipt against the successful transaction", () => {
        const transaction = findTransactionBy(
          updatedSendDataExState,
          1,
          "0xdeadbeef"
        );

        assert.deepStrictEqual(
          transaction.receipt,
          revertedTransactionMessage.receipt
        );
      });

      it("should clear all other transactions for the network interaction", () => {
        const networkInteraction = findOnchainInteractionBy(
          updatedSendDataExState,
          1
        );

        assert.equal(networkInteraction.transactions.length, 1);
      });
    });

    describe("strategy indicates send data completes successfully", () => {
      beforeEach(() => {
        updatedDeploymentState = applyMessages([
          initializeSendDataExecutionStateMessage,
          requestNetworkInteractionMessage,
          sendTransactionMessage,
          sendAnotherTransactionMessage,
          confirmTransactionMessage,
          sendDataSuccessMessage,
        ]);

        updatedSendDataExState = findExecutionStateById(
          ExecutionSateType.SEND_DATA_EXECUTION_STATE,
          updatedDeploymentState,
          "SendData1"
        );
      });

      it("should set the result against the execution state", () => {
        assert.deepStrictEqual(updatedSendDataExState.result, {
          type: ExecutionResultType.SUCCESS,
        });
      });

      it("should update the status to success", () => {
        assert.deepStrictEqual(
          updatedSendDataExState.status,
          ExecutionStatus.SUCCESS
        );
      });
    });

    describe("send data errors on a revert", () => {
      beforeEach(() => {
        updatedDeploymentState = applyMessages([
          initializeSendDataExecutionStateMessage,
          requestNetworkInteractionMessage,
          sendTransactionMessage,
          sendDataFailsWithRevertMessage,
        ]);

        updatedSendDataExState = findExecutionStateById(
          ExecutionSateType.SEND_DATA_EXECUTION_STATE,
          updatedDeploymentState,
          "SendData1"
        );
      });

      it("should set the result as a revert", () => {
        assert.deepStrictEqual(updatedSendDataExState.result, {
          type: ExecutionResultType.REVERTED_TRANSACTION,
        });
      });

      it("should update the status to failed", () => {
        assert.equal(updatedSendDataExState.status, ExecutionStatus.FAILED);
      });
    });

    describe("send data errors after a strategy error", () => {
      beforeEach(() => {
        updatedDeploymentState = applyMessages([
          initializeSendDataExecutionStateMessage,
          requestNetworkInteractionMessage,
          sendTransactionMessage,
          confirmTransactionMessage,
          sendDataFailOnStrategyError,
        ]);

        updatedSendDataExState = findExecutionStateById(
          ExecutionSateType.SEND_DATA_EXECUTION_STATE,
          updatedDeploymentState,
          "SendData1"
        );
      });

      it("should set the result as a strategy error", () => {
        assert.deepStrictEqual(updatedSendDataExState.result, {
          type: ExecutionResultType.STRATEGY_ERROR,
          error: `Transaction 0xdeadbeaf confirmed but something went wrong`,
        });
      });

      it("should update the status to failed", () => {
        assert.equal(updatedSendDataExState.status, ExecutionStatus.FAILED);
      });
    });

    describe("send data errors after a simulation error", () => {
      beforeEach(() => {
        updatedDeploymentState = applyMessages([
          initializeSendDataExecutionStateMessage,
          requestNetworkInteractionMessage,
          sendTransactionMessage,
          sendAnotherTransactionMessage,
          confirmTransactionMessage,
          sendDataFailOnSimulationError,
        ]);

        updatedSendDataExState = findExecutionStateById(
          ExecutionSateType.SEND_DATA_EXECUTION_STATE,
          updatedDeploymentState,
          "SendData1"
        );
      });

      it("should set the result as a simulation error", () => {
        assert.deepStrictEqual(updatedSendDataExState.result, {
          type: ExecutionResultType.SIMULATION_ERROR,
          error: {
            type: EvmExecutionResultTypes.REVERT_WITH_REASON,
            message: "Not a valid parameter value",
          },
        });
      });

      it("should update the status to failed", () => {
        assert.equal(updatedSendDataExState.status, ExecutionStatus.FAILED);
      });
    });
  });
});
