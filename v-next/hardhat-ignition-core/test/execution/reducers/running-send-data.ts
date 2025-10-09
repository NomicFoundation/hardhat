import { assert } from "chai";

import type { DeploymentState } from "../../../src/internal/execution/types/deployment-state.js";
import { EvmExecutionResultTypes } from "../../../src/internal/execution/types/evm-execution.js";
import { ExecutionResultType } from "../../../src/internal/execution/types/execution-result.js";
import {
  ExecutionSateType,
  ExecutionStatus,
  type SendDataExecutionState,
} from "../../../src/internal/execution/types/execution-state.js";
import { TransactionReceiptStatus } from "../../../src/internal/execution/types/jsonrpc.js";
import {
  JournalMessageType,
  type NetworkInteractionRequestMessage,
  type SendDataExecutionStateCompleteMessage,
  type SendDataExecutionStateInitializeMessage,
  type TransactionConfirmMessage,
  type TransactionSendMessage,
} from "../../../src/internal/execution/types/messages.js";
import { NetworkInteractionType } from "../../../src/internal/execution/types/network-interaction.js";
import { assertIgnitionInvariant } from "../../../src/internal/utils/assertions.js";
import { findOnchainInteractionBy } from "../../../src/internal/views/execution-state/find-onchain-interaction-by.js";
import { findTransactionBy } from "../../../src/internal/views/execution-state/find-transaction-by.js";
import { findExecutionStateById } from "../../../src/internal/views/find-execution-state-by-id.js";

import { applyMessages } from "./utils.js";

describe("DeploymentStateReducer", () => {
  describe("running a named library deploy", () => {
    const senderAddress = "0x0011223344556677889900112233445566778899";
    const exampleAddress = "0x1F98431c8aD98523631AE4a59f267346ea31F984";
    const revertedTxHash =
      "0x0011223344556677889900112233445566778899001122334455667788990011";

    let updatedDeploymentState: DeploymentState;
    let updatedSendDataExState: SendDataExecutionState;

    const initializeSendDataExecutionStateMessage: SendDataExecutionStateInitializeMessage =
      {
        type: JournalMessageType.SEND_DATA_EXECUTION_STATE_INITIALIZE,
        futureId: "SendData1",
        strategy: "basic",
        strategyConfig: {},
        dependencies: [],
        to: exampleAddress,
        data: "fake-data",
        value: BigInt(0),
        from: senderAddress,
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
      nonce: 0,
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
      nonce: 0,
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
          txHash: revertedTxHash,
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
          "SendData1",
        );
      });

      it("should populate a call execution state for the future", () => {
        assert.equal(
          updatedSendDataExState.type,
          ExecutionSateType.SEND_DATA_EXECUTION_STATE,
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
          "SendData1",
        );
      });

      it("should populate a new onchain interaction", () => {
        assert.equal(updatedSendDataExState.networkInteractions.length, 1);

        const networkInteraction =
          updatedSendDataExState.networkInteractions[0];

        assertIgnitionInvariant(
          networkInteraction.type ===
            NetworkInteractionType.ONCHAIN_INTERACTION,
          "Added Network interaction is of the wrong type ",
        );

        const { transactions, shouldBeResent, nonce, ...rest } =
          networkInteraction;

        assert.deepStrictEqual(
          rest,
          requestNetworkInteractionMessage.networkInteraction,
        );
        assert.isArray(transactions);
        assert.lengthOf(transactions, 0);
        assert.isFalse(shouldBeResent);
        assert.isUndefined(nonce);
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
          "SendData1",
        );
      });

      it("should populate the transaction against the network interaction", () => {
        const networkInteraction = findOnchainInteractionBy(
          updatedSendDataExState,
          1,
        );

        assert.equal(networkInteraction.transactions.length, 1);

        const transaction = findTransactionBy(
          updatedSendDataExState,
          1,
          "0xdeadbeef",
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
          "SendData1",
        );
      });

      it("should set the receipt against the successful transaction", () => {
        const transaction = findTransactionBy(
          updatedSendDataExState,
          1,
          "0xdeadbeef",
        );

        assert.deepStrictEqual(
          transaction.receipt,
          confirmTransactionMessage.receipt,
        );
      });

      it("should clear all other transactions for the network interaction", () => {
        const networkInteraction = findOnchainInteractionBy(
          updatedSendDataExState,
          1,
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
          "SendData1",
        );
      });

      it("should set the receipt against the successful transaction", () => {
        const transaction = findTransactionBy(
          updatedSendDataExState,
          1,
          "0xdeadbeef",
        );

        assert.deepStrictEqual(
          transaction.receipt,
          revertedTransactionMessage.receipt,
        );
      });

      it("should clear all other transactions for the network interaction", () => {
        const networkInteraction = findOnchainInteractionBy(
          updatedSendDataExState,
          1,
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
          "SendData1",
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
          ExecutionStatus.SUCCESS,
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
          "SendData1",
        );
      });

      it("should set the result as a revert", () => {
        assert.deepStrictEqual(updatedSendDataExState.result, {
          type: ExecutionResultType.REVERTED_TRANSACTION,
          txHash: revertedTxHash,
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
          "SendData1",
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
          "SendData1",
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
