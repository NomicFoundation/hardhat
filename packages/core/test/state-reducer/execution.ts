/* eslint-disable import/no-unused-modules */
import { assert } from "chai";

import { buildModule } from "../../src/buildModule";
import {
  deployStateReducer,
  initializeDeployState,
} from "../../src/internal/deployment/deployStateReducer";
import { DeployState } from "../../src/internal/types/deployment";
import { VertexResultEnum } from "../../src/internal/types/graph";

import { applyActions, resolveExecutionGraphFor } from "./utils";

describe("deployment state reducer", () => {
  let state: DeployState;

  beforeEach(async () => {
    const initialState = initializeDeployState("ExecutionExample");

    const exampleExecutionGraph = await resolveExecutionGraphFor(
      buildModule("TokenModule", (m) => {
        const token = m.contract("Token");

        const dex = m.contract("Dex", { after: [token] });
        const registrar = m.contract("Registrar", { after: [token] });

        const aggregator = m.contract("Aggregator", {
          after: [registrar],
        });

        return { token, dex, registrar, aggregator };
      })
    );

    state = applyActions(initialState, [
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
      {
        type: "TRANSFORM_COMPLETE",
        executionGraph: exampleExecutionGraph,
      },
    ]);
  });

  describe("starting execution", () => {
    beforeEach(() => {
      state = deployStateReducer(state, {
        type: "EXECUTION::START",
        executionGraphHash: "XXX",
      });
    });

    it("should update the phase to execution", () => {
      assert.equal(state.phase, "execution");
    });

    it("should set the vertexes to unstarted", () => {
      assert.deepStrictEqual(state.execution.vertexes, {
        "0": {
          status: "UNSTARTED",
          result: undefined,
        },
        "1": {
          status: "UNSTARTED",
          result: undefined,
        },
        "2": {
          status: "UNSTARTED",
          result: undefined,
        },
        "3": {
          status: "UNSTARTED",
          result: undefined,
        },
      });
    });
  });

  describe("setting new batch", () => {
    beforeEach(() => {
      state = applyActions(state, [
        {
          type: "EXECUTION::START",
          executionGraphHash: "XXX",
        },
        {
          type: "EXECUTION::SET_BATCH",
          batch: [0],
        },
      ]);
    });

    it("should move the Token vertex from uninitialized to batch", () => {
      assert.equal(state.execution.vertexes[0].status, "RUNNING");
      assert.deepStrictEqual(state.execution.batch, new Set<number>([0]));
    });
  });

  describe("updating batch", () => {
    beforeEach(() => {
      state = applyActions(state, [
        {
          type: "EXECUTION::START",
          executionGraphHash: "XXX",
        },
        {
          type: "EXECUTION::SET_BATCH",
          batch: [0],
        },
        {
          type: "EXECUTION::SET_VERTEX_RESULT",
          vertexId: 0,
          result: {
            _kind: VertexResultEnum.SUCCESS,
            result: { hash: "example" },
          },
        },
      ]);
    });

    it("should update the batch result", () => {
      assert.equal(state.execution.batch, null);

      assert.deepStrictEqual(state.execution.vertexes[0], {
        status: "COMPLETED",
        result: {
          _kind: VertexResultEnum.SUCCESS,
          result: { hash: "example" },
        },
      });
    });
  });

  describe("completing batch", () => {
    beforeEach(() => {
      state = applyActions(state, [
        {
          type: "EXECUTION::START",
          executionGraphHash: "XXX",
        },
        {
          type: "EXECUTION::SET_BATCH",
          batch: [0],
        },
        {
          type: "EXECUTION::SET_VERTEX_RESULT",
          vertexId: 0,
          result: {
            _kind: VertexResultEnum.SUCCESS,
            result: { hash: "example" },
          },
        },
      ]);
    });

    it("should complete the batch", () => {
      assert.equal(state.execution.batch, null);
      assert.deepStrictEqual(state.execution.vertexes[0], {
        status: "COMPLETED",
        result: {
          _kind: VertexResultEnum.SUCCESS,
          result: { hash: "example" },
        },
      });
    });
  });

  describe("completing deployment", () => {
    beforeEach(() => {
      state = applyActions(state, [
        {
          type: "EXECUTION::START",
          executionGraphHash: "XXX",
        },

        {
          type: "EXECUTION::SET_BATCH",
          batch: [0],
        },
        {
          type: "EXECUTION::SET_VERTEX_RESULT",
          vertexId: 0,
          result: {
            _kind: VertexResultEnum.SUCCESS,
            result: { hash: "example" },
          },
        },

        {
          type: "EXECUTION::SET_BATCH",
          batch: [1, 2],
        },
        {
          type: "EXECUTION::SET_VERTEX_RESULT",
          vertexId: 1,
          result: {
            _kind: VertexResultEnum.SUCCESS,
            result: { hash: "example" },
          },
        },
        {
          type: "EXECUTION::SET_VERTEX_RESULT",
          vertexId: 2,
          result: {
            _kind: VertexResultEnum.SUCCESS,
            result: { hash: "example" },
          },
        },

        {
          type: "EXECUTION::SET_BATCH",
          batch: [3],
        },
        {
          type: "EXECUTION::SET_VERTEX_RESULT",
          vertexId: 3,
          result: {
            _kind: VertexResultEnum.SUCCESS,
            result: { hash: "example" },
          },
        },
      ]);
    });

    it("should be in the complete phase", () => {
      assert.equal(state.phase, "complete");
    });

    it("should show the vertexes as complete", () => {
      assert.equal(state.execution.batch, null);

      assert.equal(
        Object.values(state.execution.vertexes).every(
          (v) => v.status === "COMPLETED" && v.result !== undefined
        ),
        true
      );
    });
  });

  describe("stopping on an on hold state", () => {
    beforeEach(() => {
      state = applyActions(state, [
        {
          type: "EXECUTION::START",
          executionGraphHash: "XXX",
        },

        {
          type: "EXECUTION::SET_BATCH",
          batch: [0],
        },
        {
          type: "EXECUTION::SET_VERTEX_RESULT",
          vertexId: 0,
          result: {
            _kind: VertexResultEnum.SUCCESS,
            result: { hash: "example" },
          },
        },

        {
          type: "EXECUTION::SET_BATCH",
          batch: [1],
        },
        {
          type: "EXECUTION::SET_VERTEX_RESULT",
          vertexId: 1,
          result: {
            _kind: VertexResultEnum.HOLD,
          },
        },
      ]);
    });

    it("should be in the complete phase", () => {
      assert.equal(state.phase, "hold");
    });

    it("should show the vertexes as complete", () => {
      assert.equal(state.execution.batch, null);

      assert.deepStrictEqual(state.execution.vertexes[1], {
        status: "HOLD",
        result: undefined,
      });
    });
  });

  describe("stopping on an failed state", () => {
    beforeEach(() => {
      state = applyActions(state, [
        {
          type: "EXECUTION::START",
          executionGraphHash: "XXX",
        },

        {
          type: "EXECUTION::SET_BATCH",
          batch: [0],
        },
        {
          type: "EXECUTION::SET_VERTEX_RESULT",
          vertexId: 0,
          result: {
            _kind: VertexResultEnum.SUCCESS,
            result: { hash: "example" },
          },
        },

        {
          type: "EXECUTION::SET_BATCH",
          batch: [1],
        },
        {
          type: "EXECUTION::SET_VERTEX_RESULT",
          vertexId: 1,
          result: {
            _kind: VertexResultEnum.FAILURE,
            failure: new Error("No connection"),
          },
        },
      ]);
    });

    it("should be in the complete phase", () => {
      assert.equal(state.phase, "failed");
    });

    it("should show the vertexes as complete", () => {
      assert.equal(state.execution.batch, null);

      assert.deepStrictEqual(state.execution.vertexes[1], {
        status: "FAILED",
        result: {
          _kind: VertexResultEnum.FAILURE,
          failure: new Error("No connection"),
        },
      });
    });
  });
});
