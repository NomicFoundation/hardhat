import { assert } from "chai";
import { deploymentStateReducer } from "../../../../src/new-api/internal/new-execution/reducers/deployment-state-reducer";
import { isDeploymentExecutionState } from "../../../../src/new-api/internal/new-execution/type-guards/execution-state";
import { DeploymentState } from "../../../../src/new-api/internal/new-execution/types/deployment-state";
import {
  DeploymentExecutionStateInitializeMessage,
  JournalMessage,
  JournalMessageType,
  NetworkInteractionRequestMessage,
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

    const requestNetworkInteraction: NetworkInteractionRequestMessage = {
      type: JournalMessageType.NETWORK_INTERACTION_REQUEST,
      futureId: "future1",
      networkInteraction: {
        id: 1,
        type: NetworkInteractionType.ONCHAIN_INTERACTION,
        to: exampleAddress,
        data: "fake-data",
        value: BigInt(0),
        from: "string",
        nonce: 0,
        transactions: [],
      },
    };

    describe("initialization", () => {
      beforeEach(() => {
        updatedState = applyMessages([initializeNamedContractDeployMessage]);
      });

      it("should populate a deployment execution state for the future", () => {
        const exState = updatedState.executionStates["future1"];
        assert.isDefined(exState);
        assert(isDeploymentExecutionState(exState));
      });
    });

    describe("requesting an onchain interaction", () => {
      beforeEach(() => {
        updatedState = applyMessages([
          initializeNamedContractDeployMessage,
          requestNetworkInteraction,
        ]);
      });

      it("should populate a transaction", () => {
        const exState = updatedState.executionStates["future1"];

        assertIgnitionInvariant(
          isDeploymentExecutionState(exState),
          "has to be a deployment execution state"
        );

        assert.equal(exState.networkInteractions.length, 1);
        const networkInteraction = exState.networkInteractions[0];

        assert.isDefined(networkInteraction);
        assert.deepStrictEqual(
          requestNetworkInteraction.networkInteraction,
          networkInteraction
        );
      });
    });
  });
});

function applyMessages(messages: JournalMessage[]) {
  const initialState = deploymentStateReducer(undefined);

  return messages.reduce(deploymentStateReducer, initialState);
}
