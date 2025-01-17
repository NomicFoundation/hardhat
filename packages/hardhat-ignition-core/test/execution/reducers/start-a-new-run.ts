import { assert } from "chai";

import { deploymentStateReducer } from "../../../src/internal/execution/reducers/deployment-state-reducer";
import { DeploymentState } from "../../../src/internal/execution/types/deployment-state";
import { JournalMessageType } from "../../../src/internal/execution/types/messages";

describe("DeploymentStateReducer", () => {
  let initialState: DeploymentState;
  let updatedState: DeploymentState;

  describe("starting a new run", () => {
    beforeEach(() => {
      initialState = deploymentStateReducer(undefined);

      updatedState = deploymentStateReducer(initialState, {
        type: JournalMessageType.DEPLOYMENT_INITIALIZE,
        chainId: 31337,
      });
    });

    it("should set the chainId", () => {
      assert.equal(updatedState.chainId, 31337);
    });

    it("should leave the previous execution states", () => {
      assert.deepEqual(
        initialState.executionStates,
        updatedState.executionStates
      );
    });
  });
});
