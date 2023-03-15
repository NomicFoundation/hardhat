/* eslint-disable import/no-unused-modules */
import { assert } from "chai";

import {
  deployStateReducer,
  initializeDeployState,
} from "../../src/deployment/deployStateReducer";
import { buildModule } from "../../src/dsl/buildModule";
import { DeployState } from "../../src/types/deployment";
import { IExecutionGraph } from "../../src/types/executionGraph";

import { applyActions, resolveExecutionGraphFor } from "./utils";

describe("deployment state reducer", () => {
  let state: DeployState;
  beforeEach(() => {
    state = initializeDeployState("Example");
  });

  describe("initialization", () => {
    it("sets the module name", () => {
      assert.equal(state.details.moduleName, "Example");
    });
  });

  describe("setup", () => {
    it("supports setting the chainId", () => {
      const updated = deployStateReducer(state, {
        type: "SET_CHAIN_ID",
        chainId: 31337,
      });

      assert.equal(updated.details.chainId, 31337);
    });

    it("supports setting the network name", () => {
      const updated = deployStateReducer(state, {
        type: "SET_NETWORK_NAME",
        networkName: "Hardhat",
      });

      assert.equal(updated.details.networkName, "Hardhat");
    });
  });

  describe("validation", () => {
    beforeEach(() => {
      state = applyActions(state, [
        {
          type: "SET_CHAIN_ID",
          chainId: 31337,
        },
        {
          type: "SET_NETWORK_NAME",
          networkName: "Hardhat",
        },
        {
          type: "START_VALIDATION",
        },
      ]);
    });

    describe("starting", () => {
      it("should update the phase", () => {
        assert.equal(state.phase, "validating");
      });
    });

    describe("failure", () => {
      beforeEach(() => {
        state = deployStateReducer(state, {
          type: "VALIDATION_FAIL",
          errors: [new Error("Bad input")],
        });
      });

      it("should update the phase", () => {
        assert.equal(state.phase, "validation-failed");
      });

      it("should set errors against the validation phase", () => {
        assert.equal(state.validation.errors.length, 1);
        assert.equal(state.validation.errors[0].message, "Bad input");
      });
    });
  });

  describe("transform", () => {
    let exampleExecutionGraph: IExecutionGraph;

    beforeEach(async () => {
      exampleExecutionGraph = await resolveExecutionGraphFor(
        buildModule("TokenModule", (m) => {
          const token = m.contract("Token");

          return { token };
        })
      );

      state = applyActions(state, [
        {
          type: "SET_CHAIN_ID",
          chainId: 31337,
        },
        {
          type: "SET_NETWORK_NAME",
          networkName: "Hardhat",
        },
        {
          type: "START_VALIDATION",
        },
      ]);
    });

    describe("completion", () => {
      beforeEach(() => {
        state = applyActions(state, [
          {
            type: "TRANSFORM_COMPLETE",
            executionGraph: exampleExecutionGraph,
          },
        ]);
      });

      it("should set the execution graph", () => {
        if (state.transform.executionGraph === null) {
          assert.fail();
        }

        assert.equal(state.transform.executionGraph.vertexes.size, 1);
      });
    });

    describe("unexpected failure", () => {
      beforeEach(() => {
        state = applyActions(state, [
          {
            type: "UNEXPECTED_FAIL",
            errors: [new Error("Failed graph transform")],
          },
        ]);
      });

      it("should not set the execution graph", () => {
        assert.isNull(state.transform.executionGraph);
      });

      it("should set the an entry in the unexpected errors", () => {
        assert.deepStrictEqual(state.unexpected.errors, [
          new Error("Failed graph transform"),
        ]);
      });
    });
  });
});
