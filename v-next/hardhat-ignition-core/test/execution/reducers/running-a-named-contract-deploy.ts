import { assert } from "chai";

import { DeploymentState } from "../../../src/internal/execution/types/deployment-state.js";
import { EvmExecutionResultTypes } from "../../../src/internal/execution/types/evm-execution.js";
import { ExecutionResultType } from "../../../src/internal/execution/types/execution-result.js";
import {
  DeploymentExecutionState,
  ExecutionSateType,
  ExecutionStatus,
} from "../../../src/internal/execution/types/execution-state.js";
import { TransactionReceiptStatus } from "../../../src/internal/execution/types/jsonrpc.js";
import {
  DeploymentExecutionStateCompleteMessage,
  DeploymentExecutionStateInitializeMessage,
  JournalMessageType,
  NetworkInteractionRequestMessage,
  TransactionConfirmMessage,
  TransactionSendMessage,
} from "../../../src/internal/execution/types/messages.js";
import { NetworkInteractionType } from "../../../src/internal/execution/types/network-interaction.js";
import { assertIgnitionInvariant } from "../../../src/internal/utils/assertions.js";
import { findOnchainInteractionBy } from "../../../src/internal/views/execution-state/find-onchain-interaction-by.js";
import { findTransactionBy } from "../../../src/internal/views/execution-state/find-transaction-by.js";
import { findExecutionStateById } from "../../../src/internal/views/find-execution-state-by-id.js";
import { FutureType } from "../../../src/types/module.js";

import { applyMessages } from "./utils.js";

describe("DeploymentStateReducer", () => {
  describe("running a named contract deploy", () => {
    const senderAddress = "0x0011223344556677889900112233445566778899";
    const exampleAddress = "0x1F98431c8aD98523631AE4a59f267346ea31F984";
    const differentAddress = "0xBA12222222228d8Ba445958a75a0704d566BF2C8";
    const revertedTxHash =
      "0x0011223344556677889900112233445566778899001122334455667788990011";

    let updatedDeploymentState: DeploymentState;
    let updatedDepExState: DeploymentExecutionState;

    const initializeNamedContractDeployMessage: DeploymentExecutionStateInitializeMessage =
      {
        type: JournalMessageType.DEPLOYMENT_EXECUTION_STATE_INITIALIZE,
        futureId: "future1",
        futureType: FutureType.NAMED_ARTIFACT_CONTRACT_DEPLOYMENT,
        strategy: "basic",
        strategyConfig: {},
        dependencies: [],
        artifactId: "future1",
        contractName: "MyContract",
        constructorArgs: [],
        libraries: {},
        value: BigInt(0),
        from: senderAddress,
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
      },
    };

    const requestStaticCallInteractionMessage: NetworkInteractionRequestMessage =
      {
        type: JournalMessageType.NETWORK_INTERACTION_REQUEST,
        futureId: "future1",
        networkInteraction: {
          id: 1,
          type: NetworkInteractionType.STATIC_CALL,
          to: undefined,
          data: "fake-data",
          value: BigInt(0),
          from: differentAddress,
        },
      };

    const sendTransactionMessage: TransactionSendMessage = {
      type: JournalMessageType.TRANSACTION_SEND,
      futureId: "future1",
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
      futureId: "future1",
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
          txHash: revertedTxHash,
        },
      };

    const deploymentFailsOnStaticCall: DeploymentExecutionStateCompleteMessage =
      {
        type: JournalMessageType.DEPLOYMENT_EXECUTION_STATE_COMPLETE,
        futureId: "future1",
        result: {
          type: ExecutionResultType.STATIC_CALL_ERROR,
          error: {
            type: EvmExecutionResultTypes.REVERT_WITH_REASON,
            message: "Not a valid parameter value",
          },
        },
      };

    const deploymentFailOnStrategyError: DeploymentExecutionStateCompleteMessage =
      {
        type: JournalMessageType.DEPLOYMENT_EXECUTION_STATE_COMPLETE,
        futureId: "future1",
        result: {
          type: ExecutionResultType.STRATEGY_ERROR,
          error: `Transaction 0xdeadbeaf confirmed but it didn't create a contract`,
        },
      };

    const deploymentFailOnSimulationError: DeploymentExecutionStateCompleteMessage =
      {
        type: JournalMessageType.DEPLOYMENT_EXECUTION_STATE_COMPLETE,
        futureId: "future1",
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
          initializeNamedContractDeployMessage,
        ]);

        updatedDepExState = findExecutionStateById(
          ExecutionSateType.DEPLOYMENT_EXECUTION_STATE,
          updatedDeploymentState,
          "future1",
        );
      });

      it("should populate a deployment execution state for the future", () => {
        assert.equal(
          updatedDepExState.type,
          ExecutionSateType.DEPLOYMENT_EXECUTION_STATE,
        );
      });
    });

    describe("strategy requesting an onchain interaction", () => {
      beforeEach(() => {
        updatedDeploymentState = applyMessages([
          initializeNamedContractDeployMessage,
          requestNetworkInteractionMessage,
        ]);

        updatedDepExState = findExecutionStateById(
          ExecutionSateType.DEPLOYMENT_EXECUTION_STATE,
          updatedDeploymentState,
          "future1",
        );
      });

      it("should populate a new onchain interaction", () => {
        assert.equal(updatedDepExState.networkInteractions.length, 1);

        const networkInteraction = updatedDepExState.networkInteractions[0];

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
          initializeNamedContractDeployMessage,
          requestNetworkInteractionMessage,
          sendTransactionMessage,
        ]);

        updatedDepExState = findExecutionStateById(
          ExecutionSateType.DEPLOYMENT_EXECUTION_STATE,
          updatedDeploymentState,
          "future1",
        );
      });

      it("should populate the transaction against the network interaction", () => {
        const networkInteraction = findOnchainInteractionBy(
          updatedDepExState,
          1,
        );

        assert.equal(networkInteraction.transactions.length, 1);

        const transaction = findTransactionBy(
          updatedDepExState,
          1,
          "0xdeadbeef",
        );

        assert.deepStrictEqual(sendTransactionMessage.transaction, transaction);
      });
    });

    describe("transaction confirms successfully", () => {
      beforeEach(() => {
        updatedDeploymentState = applyMessages([
          initializeNamedContractDeployMessage,
          requestNetworkInteractionMessage,
          sendTransactionMessage,
          sendAnotherTransactionMessage,
          confirmTransactionMessage,
        ]);

        updatedDepExState = findExecutionStateById(
          ExecutionSateType.DEPLOYMENT_EXECUTION_STATE,
          updatedDeploymentState,
          "future1",
        );
      });

      it("should set the receipt against the successful transaction", () => {
        const transaction = findTransactionBy(
          updatedDepExState,
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
          updatedDepExState,
          1,
        );

        assert.equal(networkInteraction.transactions.length, 1);
      });
    });

    describe("strategy indicates deployment completes successfully", () => {
      beforeEach(() => {
        updatedDeploymentState = applyMessages([
          initializeNamedContractDeployMessage,
          requestNetworkInteractionMessage,
          sendTransactionMessage,
          sendAnotherTransactionMessage,
          confirmTransactionMessage,
          deploymentSuccessMessage,
        ]);

        updatedDepExState = findExecutionStateById(
          ExecutionSateType.DEPLOYMENT_EXECUTION_STATE,
          updatedDeploymentState,
          "future1",
        );
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
          ExecutionStatus.SUCCESS,
        );
      });
    });

    describe("deployment errors on a revert", () => {
      beforeEach(() => {
        updatedDeploymentState = applyMessages([
          initializeNamedContractDeployMessage,
          requestNetworkInteractionMessage,
          sendTransactionMessage,
          deploymentFailsWithRevertMessage,
        ]);

        updatedDepExState = findExecutionStateById(
          ExecutionSateType.DEPLOYMENT_EXECUTION_STATE,
          updatedDeploymentState,
          "future1",
        );
      });

      it("should set the result as a revert", () => {
        assert.deepStrictEqual(updatedDepExState.result, {
          type: ExecutionResultType.REVERTED_TRANSACTION,
          txHash: revertedTxHash,
        });
      });

      it("should update the status to failed", () => {
        assert.equal(updatedDepExState.status, ExecutionStatus.FAILED);
      });
    });

    /**
     * This is possible because an execution strategy can make static calls
     * for a deployment.
     */
    describe("deployment errors after a failed static call", () => {
      beforeEach(() => {
        updatedDeploymentState = applyMessages([
          initializeNamedContractDeployMessage,
          requestStaticCallInteractionMessage,
          deploymentFailsOnStaticCall,
        ]);

        updatedDepExState = findExecutionStateById(
          ExecutionSateType.DEPLOYMENT_EXECUTION_STATE,
          updatedDeploymentState,
          "future1",
        );
      });

      it("should set the result as a static call error", () => {
        assert.deepStrictEqual(updatedDepExState.result, {
          type: ExecutionResultType.STATIC_CALL_ERROR,
          error: {
            type: EvmExecutionResultTypes.REVERT_WITH_REASON,
            message: "Not a valid parameter value",
          },
        });
      });

      it("should update the status to failed", () => {
        assert.equal(updatedDepExState.status, ExecutionStatus.FAILED);
      });
    });

    describe("deployment errors after a strategy error", () => {
      beforeEach(() => {
        updatedDeploymentState = applyMessages([
          initializeNamedContractDeployMessage,
          requestNetworkInteractionMessage,
          sendTransactionMessage,
          sendAnotherTransactionMessage,
          confirmTransactionMessage,
          deploymentFailOnStrategyError,
        ]);

        updatedDepExState = findExecutionStateById(
          ExecutionSateType.DEPLOYMENT_EXECUTION_STATE,
          updatedDeploymentState,
          "future1",
        );
      });

      it("should set the result as a strategy error", () => {
        assert.deepStrictEqual(updatedDepExState.result, {
          type: ExecutionResultType.STRATEGY_ERROR,
          error:
            "Transaction 0xdeadbeaf confirmed but it didn't create a contract",
        });
      });

      it("should update the status to failed", () => {
        assert.equal(updatedDepExState.status, ExecutionStatus.FAILED);
      });
    });

    describe("deployment errors after a simulation error", () => {
      beforeEach(() => {
        updatedDeploymentState = applyMessages([
          initializeNamedContractDeployMessage,
          requestNetworkInteractionMessage,
          sendTransactionMessage,
          sendAnotherTransactionMessage,
          confirmTransactionMessage,
          deploymentFailOnSimulationError,
        ]);

        updatedDepExState = findExecutionStateById(
          ExecutionSateType.DEPLOYMENT_EXECUTION_STATE,
          updatedDeploymentState,
          "future1",
        );
      });

      it("should set the result as a simulation error", () => {
        assert.deepStrictEqual(updatedDepExState.result, {
          type: ExecutionResultType.SIMULATION_ERROR,
          error: {
            type: EvmExecutionResultTypes.REVERT_WITH_REASON,
            message: "Not a valid parameter value",
          },
        });
      });

      it("should update the status to failed", () => {
        assert.equal(updatedDepExState.status, ExecutionStatus.FAILED);
      });
    });
  });
});
