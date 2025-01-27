import { assert } from "chai";

import { DeploymentState } from "../../../src/internal/execution/types/deployment-state.js";
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
import { findExecutionStateById } from "../../../src/internal/views/find-execution-state-by-id.js";
import { FutureType } from "../../../src/types/module.js";

import { applyMessages } from "./utils.js";

describe("DeploymentStateReducer", () => {
  describe("running a named library deploy", () => {
    const senderAddress = "0x0011223344556677889900112233445566778899";
    const exampleAddress = "0x1F98431c8aD98523631AE4a59f267346ea31F984";

    let updatedDeploymentState: DeploymentState;
    let updatedDepExState: DeploymentExecutionState;

    const initializeNamedLibraryDeployMessage: DeploymentExecutionStateInitializeMessage =
      {
        type: JournalMessageType.DEPLOYMENT_EXECUTION_STATE_INITIALIZE,
        futureId: "future1",
        futureType: FutureType.NAMED_ARTIFACT_LIBRARY_DEPLOYMENT,
        strategy: "basic",
        strategyConfig: {},
        dependencies: [],
        artifactId: "future1",
        contractName: "MyLibrary",
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

    describe("initialization", () => {
      beforeEach(() => {
        updatedDeploymentState = applyMessages([
          initializeNamedLibraryDeployMessage,
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

    describe("deployment completes successfully", () => {
      beforeEach(() => {
        updatedDeploymentState = applyMessages([
          initializeNamedLibraryDeployMessage,
          requestNetworkInteractionMessage,
          sendTransactionMessage,
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
  });
});
