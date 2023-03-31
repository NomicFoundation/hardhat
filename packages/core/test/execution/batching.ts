/* eslint-disable import/no-unused-modules */
import type {
  ContractDeployExecutionVertex,
  ExecutionVertex,
  ExecutionVertexVisitResult,
} from "../../src/internal/types/executionGraph";

import { assert } from "chai";
import { BigNumber } from "ethers";

import { Deployment } from "../../src/internal/deployment/Deployment";
import { ExecutionGraph } from "../../src/internal/execution/ExecutionGraph";
import { executeInBatches } from "../../src/internal/execution/execute";
import {
  VertexResultEnum,
  VisitResultState,
} from "../../src/internal/types/graph";
import { ICommandJournal } from "../../src/internal/types/journal";
import { buildAdjacencyListFrom } from "../graph/helpers";

describe("Execution - batching", () => {
  it("should run", async () => {
    const vertex0: ExecutionVertex = createFakeContractDeployVertex(0, "first");
    const vertex1: ExecutionVertex = createFakeContractDeployVertex(
      1,
      "second"
    );
    const vertex2: ExecutionVertex = createFakeContractDeployVertex(2, "third");

    const executionGraph = new ExecutionGraph();
    executionGraph.adjacencyList = buildAdjacencyListFrom({
      0: [1],
      1: [2],
      2: [],
    });

    executionGraph.vertexes.set(0, vertex0);
    executionGraph.vertexes.set(1, vertex1);
    executionGraph.vertexes.set(2, vertex2);

    const mockServices = {} as any;
    const mockJournal: ICommandJournal = {
      record: async () => {},
      async *read() {},
    };
    const mockUpdateUiAction = () => {};

    const deployment = new Deployment(
      "MyModule",
      mockServices,
      mockJournal,
      mockUpdateUiAction
    );

    const result = await executeInBatches(
      deployment,
      executionGraph,
      async (): Promise<ExecutionVertexVisitResult> => {
        return { _kind: VertexResultEnum.SUCCESS, result: {} as any };
      },
      {} as any
    );

    assert.isDefined(result);
    assert.equal(result._kind, VisitResultState.SUCCESS);
  });
});

function createFakeContractDeployVertex(
  vertexId: number,
  label: string
): ContractDeployExecutionVertex {
  return {
    type: "ContractDeploy",
    id: vertexId,
    label,
    artifact: {} as any,
    args: [],
    libraries: {},
    value: BigNumber.from(0),
    signer: {} as any,
  };
}
