import { assert } from "chai";

import type { DeploymentState } from "../../../src/internal/execution/types/deployment-state.js";
import {
  type ContractAtExecutionState,
  ExecutionSateType,
  ExecutionStatus,
} from "../../../src/internal/execution/types/execution-state.js";
import {
  type ContractAtExecutionStateInitializeMessage,
  JournalMessageType,
} from "../../../src/internal/execution/types/messages.js";
import { findExecutionStateById } from "../../../src/internal/views/find-execution-state-by-id.js";
import { FutureType } from "../../../src/types/module.js";

import { applyMessages } from "./utils.js";

describe("DeploymentStateReducer", () => {
  describe("running a contract at", () => {
    const exampleAddress = "0x1F98431c8aD98523631AE4a59f267346ea31F984";
    // const differentAddress = "0xBA12222222228d8Ba445958a75a0704d566BF2C8";

    let updatedDeploymentState: DeploymentState;
    let updatedContractAtExState: ContractAtExecutionState;

    const initializeContractAtExecutionStateMessage: ContractAtExecutionStateInitializeMessage =
      {
        type: JournalMessageType.CONTRACT_AT_EXECUTION_STATE_INITIALIZE,
        futureId: "ContractAt1",
        futureType: FutureType.NAMED_ARTIFACT_CONTRACT_AT,
        strategy: "basic",
        strategyConfig: {},
        dependencies: [],
        artifactId: "ContractAt1",
        contractName: "ContractAt1",
        contractAddress: exampleAddress,
      };

    describe("initialization", () => {
      beforeEach(() => {
        updatedDeploymentState = applyMessages([
          initializeContractAtExecutionStateMessage,
        ]);

        updatedContractAtExState = findExecutionStateById(
          ExecutionSateType.CONTRACT_AT_EXECUTION_STATE,
          updatedDeploymentState,
          "ContractAt1",
        );
      });

      it("should populate a contract at execution state for the future", () => {
        assert.equal(
          updatedContractAtExState.type,
          ExecutionSateType.CONTRACT_AT_EXECUTION_STATE,
        );
      });

      it("should set the contract at as already succeeded", () => {
        assert.equal(updatedContractAtExState.status, ExecutionStatus.SUCCESS);
      });

      it("should populate the relevant contract fields", () => {
        assert.equal(updatedContractAtExState.artifactId, "ContractAt1");
        assert.equal(updatedContractAtExState.contractName, "ContractAt1");
        assert.equal(updatedContractAtExState.contractAddress, exampleAddress);
      });
    });
  });
});
