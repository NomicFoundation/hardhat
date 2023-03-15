/* eslint-disable import/no-unused-modules */
import type {
  ContractDeploy,
  ExecutionVertex,
  ExecutionVertexVisitResult,
} from "../../src/types/executionGraph";

import { assert } from "chai";
import { BigNumber } from "ethers";

import { Deployment } from "../../src/deployment/Deployment";
import { ExecutionGraph } from "../../src/execution/ExecutionGraph";
import { executeInBatches } from "../../src/execution/execute";
import { VertexResultEnum } from "../../src/types/graph";
import { ICommandJournal } from "../../src/types/journal";
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
    assert.equal(result._kind, "success");
  });
});

function createFakeContractDeployVertex(
  vertexId: number,
  label: string
): ContractDeploy {
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
