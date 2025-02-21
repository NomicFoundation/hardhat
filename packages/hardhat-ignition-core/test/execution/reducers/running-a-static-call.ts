import { assert } from "chai";

import { DeploymentState } from "../../../src/internal/execution/types/deployment-state";
import { EvmExecutionResultTypes } from "../../../src/internal/execution/types/evm-execution";
import { ExecutionResultType } from "../../../src/internal/execution/types/execution-result";
import {
  ExecutionStateType,
  ExecutionStatus,
  StaticCallExecutionState,
} from "../../../src/internal/execution/types/execution-state";
import {
  JournalMessageType,
  NetworkInteractionRequestMessage,
  StaticCallCompleteMessage,
  StaticCallExecutionStateCompleteMessage,
  StaticCallExecutionStateInitializeMessage,
} from "../../../src/internal/execution/types/messages";
import { NetworkInteractionType } from "../../../src/internal/execution/types/network-interaction";
import { findExecutionStateById } from "../../../src/internal/views/find-execution-state-by-id";

import { applyMessages } from "./utils";

describe("DeploymentStateReducer", () => {
  describe("running a static call", () => {
    const senderAddress = "0x0011223344556677889900112233445566778899";
    const exampleAddress = "0x1F98431c8aD98523631AE4a59f267346ea31F984";
    const differentAddress = "0xBA12222222228d8Ba445958a75a0704d566BF2C8";

    let updatedDeploymentState: DeploymentState;
    let updatedStaticCallExState: StaticCallExecutionState;

    const initializeCallExecutionStateMessage: StaticCallExecutionStateInitializeMessage =
      {
        type: JournalMessageType.STATIC_CALL_EXECUTION_STATE_INITIALIZE,
        futureId: "StaticCall1",
        strategy: "basic",
        strategyConfig: {},
        dependencies: [],
        artifactId: "Contract1",
        contractAddress: exampleAddress,
        functionName: "configure",
        args: ["a", BigInt(2)],
        nameOrIndex: 0,
        from: senderAddress,
      };

    const requestStaticCallInteractionMessage: NetworkInteractionRequestMessage =
      {
        type: JournalMessageType.NETWORK_INTERACTION_REQUEST,
        futureId: "StaticCall1",
        networkInteraction: {
          id: 1,
          type: NetworkInteractionType.STATIC_CALL,
          to: exampleAddress,
          data: "fake-data",
          value: BigInt(0),
          from: differentAddress,
        },
      };

    const completeStaticCallInteractionMessage: StaticCallCompleteMessage = {
      type: JournalMessageType.STATIC_CALL_COMPLETE,
      futureId: "StaticCall1",
      networkInteractionId: 1,
      result: {
        returnData: "example-return-data",
        success: true,
        customErrorReported: false,
      },
    };

    const failStaticCallInteractionMessage: StaticCallCompleteMessage = {
      type: JournalMessageType.STATIC_CALL_COMPLETE,
      futureId: "StaticCall1",
      networkInteractionId: 1,
      result: {
        returnData: "failure-data",
        success: false,
        customErrorReported: true,
      },
    };

    const staticCallExStateSuccessMessage: StaticCallExecutionStateCompleteMessage =
      {
        type: JournalMessageType.STATIC_CALL_EXECUTION_STATE_COMPLETE,
        futureId: "StaticCall1",
        result: {
          type: ExecutionResultType.SUCCESS,
          value: 1n,
        },
      };

    const staticCallStrategyErrorMessage: StaticCallExecutionStateCompleteMessage =
      {
        type: JournalMessageType.STATIC_CALL_EXECUTION_STATE_COMPLETE,
        futureId: "StaticCall1",
        result: {
          type: ExecutionResultType.STRATEGY_ERROR,
          error: "Static call failed",
        },
      };

    const staticCallFailedMessage: StaticCallExecutionStateCompleteMessage = {
      type: JournalMessageType.STATIC_CALL_EXECUTION_STATE_COMPLETE,
      futureId: "StaticCall1",
      result: {
        type: ExecutionResultType.STATIC_CALL_ERROR,
        error: {
          type: EvmExecutionResultTypes.REVERT_WITH_PANIC_CODE,
          panicCode: 404,
          panicName: "Not found",
        },
      },
    };

    describe("initialization", () => {
      beforeEach(() => {
        updatedDeploymentState = applyMessages([
          initializeCallExecutionStateMessage,
        ]);

        updatedStaticCallExState = findExecutionStateById(
          ExecutionStateType.STATIC_CALL_EXECUTION_STATE,
          updatedDeploymentState,
          "StaticCall1"
        );
      });

      it("should populate a static call execution state for the future", () => {
        assert.equal(
          updatedStaticCallExState.type,
          ExecutionStateType.STATIC_CALL_EXECUTION_STATE
        );
      });
    });

    describe("strategy requesting a static call interaction", () => {
      beforeEach(() => {
        updatedDeploymentState = applyMessages([
          initializeCallExecutionStateMessage,
          requestStaticCallInteractionMessage,
        ]);

        updatedStaticCallExState = findExecutionStateById(
          ExecutionStateType.STATIC_CALL_EXECUTION_STATE,
          updatedDeploymentState,
          "StaticCall1"
        );
      });

      it("should populate a new static call interaction", () => {
        assert.equal(updatedStaticCallExState.networkInteractions.length, 1);

        assert.deepStrictEqual(
          updatedStaticCallExState.networkInteractions[0],
          requestStaticCallInteractionMessage.networkInteraction
        );
      });
    });

    describe("execution engine successfully performs static call", () => {
      beforeEach(() => {
        updatedDeploymentState = applyMessages([
          initializeCallExecutionStateMessage,
          requestStaticCallInteractionMessage,
          completeStaticCallInteractionMessage,
        ]);

        updatedStaticCallExState = findExecutionStateById(
          ExecutionStateType.STATIC_CALL_EXECUTION_STATE,
          updatedDeploymentState,
          "StaticCall1"
        );
      });

      it("should set the result against the static call interaction", () => {
        assert.equal(updatedStaticCallExState.networkInteractions.length, 1);

        const { result: actualResult, ...actualRest } =
          updatedStaticCallExState.networkInteractions[0];

        assert.deepStrictEqual(
          actualRest,
          requestStaticCallInteractionMessage.networkInteraction
        );
        assert.deepStrictEqual(
          actualResult,
          completeStaticCallInteractionMessage.result
        );
      });
    });

    describe("strategy indicates static call completes successfully", () => {
      beforeEach(() => {
        updatedDeploymentState = applyMessages([
          initializeCallExecutionStateMessage,
          requestStaticCallInteractionMessage,
          completeStaticCallInteractionMessage,
          staticCallExStateSuccessMessage,
        ]);

        updatedStaticCallExState = findExecutionStateById(
          ExecutionStateType.STATIC_CALL_EXECUTION_STATE,
          updatedDeploymentState,
          "StaticCall1"
        );
      });

      it("should set the result against the execution state", () => {
        assert.deepStrictEqual(updatedStaticCallExState.result, {
          type: ExecutionResultType.SUCCESS,
          value: 1n,
        });
      });

      it("should update the status to success", () => {
        assert.deepStrictEqual(
          updatedStaticCallExState.status,
          ExecutionStatus.SUCCESS
        );
      });
    });

    describe("strategy indicates static call errored with failed call", () => {
      beforeEach(() => {
        updatedDeploymentState = applyMessages([
          initializeCallExecutionStateMessage,
          requestStaticCallInteractionMessage,
          failStaticCallInteractionMessage,
          staticCallFailedMessage,
        ]);

        updatedStaticCallExState = findExecutionStateById(
          ExecutionStateType.STATIC_CALL_EXECUTION_STATE,
          updatedDeploymentState,
          "StaticCall1"
        );
      });

      it("should set the result against the execution state", () => {
        assert.deepStrictEqual(updatedStaticCallExState.result, {
          type: ExecutionResultType.STATIC_CALL_ERROR,
          error: {
            type: EvmExecutionResultTypes.REVERT_WITH_PANIC_CODE,
            panicCode: 404,
            panicName: "Not found",
          },
        });
      });

      it("should update the status to failed", () => {
        assert.deepStrictEqual(
          updatedStaticCallExState.status,
          ExecutionStatus.FAILED
        );
      });
    });

    describe("strategy indicates static call errored with custom strategy error", () => {
      beforeEach(() => {
        updatedDeploymentState = applyMessages([
          initializeCallExecutionStateMessage,
          staticCallStrategyErrorMessage,
        ]);

        updatedStaticCallExState = findExecutionStateById(
          ExecutionStateType.STATIC_CALL_EXECUTION_STATE,
          updatedDeploymentState,
          "StaticCall1"
        );
      });

      it("should set the result against the execution state", () => {
        assert.deepStrictEqual(updatedStaticCallExState.result, {
          type: ExecutionResultType.STRATEGY_ERROR,
          error: "Static call failed",
        });
      });

      it("should update the status to failed", () => {
        assert.deepStrictEqual(
          updatedStaticCallExState.status,
          ExecutionStatus.FAILED
        );
      });
    });
  });
});
