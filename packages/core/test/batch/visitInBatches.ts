/* eslint-disable import/no-unused-modules */
import { assert } from "chai";

import { Deployment } from "deployment/Deployment";
import { ExecutionGraph } from "execution/ExecutionGraph";
import { visitInBatches } from "execution/batch/visitInBatches";
import { ContractDeploy, ExecutionVertex } from "types/executionGraph";
import { VertexVisitResult } from "types/graph";

import { buildAdjacencyListFrom } from "../graph/helpers";

describe("Execution - visitInBatches", () => {
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
    const mockUpdateUiAction = () => {};

    const deployment = new Deployment(
      { name: "MyRecipe" },
      mockServices,
      mockUpdateUiAction
    );

    const result = await visitInBatches(
      deployment,
      executionGraph,
      async (): Promise<VertexVisitResult> => {
        return { _kind: "success", result: true };
      }
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
  };
}
