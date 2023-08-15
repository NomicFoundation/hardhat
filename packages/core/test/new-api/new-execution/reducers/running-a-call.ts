import { assert } from "chai";

import { DeploymentState } from "../../../../src/new-api/internal/new-execution/types/deployment-state";
import {
  CallExecutionState,
  ExecutionSateType,
} from "../../../../src/new-api/internal/new-execution/types/execution-state";
import {
  CallExecutionStateInitializeMessage,
  JournalMessageType,
} from "../../../../src/new-api/internal/new-execution/types/messages";
import { findCallExecutionStateBy } from "../../../../src/new-api/internal/new-execution/views/find-call-execution-state-by";
import { FutureType } from "../../../../src/new-api/types/module";

import { applyMessages } from "./utils";

describe("DeploymentStateReducer", () => {
  describe("running a named library deploy", () => {
    const exampleAddress = "0x1F98431c8aD98523631AE4a59f267346ea31F984";

    let updatedDeploymentState: DeploymentState;
    let updatedCallExState: CallExecutionState;

    const initializeCallExecutionState: CallExecutionStateInitializeMessage = {
      type: JournalMessageType.CALL_EXECUTION_STATE_INITIALIZE,
      futureId: "Call1",
      futureType: FutureType.NAMED_LIBRARY_DEPLOYMENT,
      strategy: "basic",
      dependencies: [],
      artifactFutureId: "Contract1",
      contractAddress: exampleAddress,
      functionName: "configure",
      args: ["a", BigInt(2)],
      value: BigInt(0),
      from: undefined,
    };

    describe("initialization", () => {
      beforeEach(() => {
        updatedDeploymentState = applyMessages([initializeCallExecutionState]);

        updatedCallExState = findCallExecutionStateBy(
          updatedDeploymentState,
          "Call1"
        );
      });

      it("should populate a call execution state for the future", () => {
        assert.equal(
          updatedCallExState.type,
          ExecutionSateType.CALL_EXECUTION_STATE
        );
      });
    });
  });
});
