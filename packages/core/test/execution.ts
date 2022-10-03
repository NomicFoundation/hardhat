/* eslint-disable import/no-unused-modules */
import { assert } from "chai";

import { Deployment } from "deployment/Deployment";
import { ExecutionGraph } from "execution/ExecutionGraph";
import { execute } from "execution/execute";
import { Services, TransactionOptions } from "services/types";
import { ExecutionVertex } from "types/executionGraph";
import { Artifact } from "types/hardhat";

import { buildAdjacencyListFrom } from "./graph/helpers";
import { getMockServices } from "./helpers";

describe("Execution", () => {
  it("should execute a contract deploy", async () => {
    const fakeArtifact: Artifact = {
      contractName: "Foo",
      abi: [],
      bytecode: "0x0",
      linkReferences: {},
    };

    const contractDeploy: ExecutionVertex = {
      type: "ContractDeploy",
      id: 0,
      label: "Foo",
      artifact: fakeArtifact,
      args: [1, "example"],
      libraries: {
        Math: {} as any,
      },
    };

    let actualArtifact: Artifact | undefined;
    let actualArgs: any[] | undefined;
    let actualLibraries: { [k: string]: any } | undefined;

    const mockServices = {
      ...getMockServices(),
      contracts: {
        deploy: async (
          artifact: Artifact,
          args: any[],
          libraries: { [k: string]: any },
          _txOptions?: TransactionOptions
        ): Promise<string> => {
          actualArtifact = artifact;
          actualArgs = args;
          actualLibraries = libraries;

          return "0x0";
        },
      } as any,
      transactions: {
        wait: (txHash: string) => {
          if (txHash !== "0x0") {
            assert.fail("Wrong transaction address");
          }

          return { contractAddress: "0xAddr" };
        },
      } as any,
    };

    const response = await assertExecuteSingleVertex(
      contractDeploy,
      mockServices
    );

    assert.deepStrictEqual(actualArtifact, fakeArtifact);
    assert.deepStrictEqual(actualArgs, contractDeploy.args);
    assert.deepStrictEqual(actualLibraries, contractDeploy.libraries);

    assert.isDefined(response);
    if (response._kind === "failure") {
      return assert.fail("deploy failed");
    }

    assert.deepStrictEqual(response.result.get(0), {
      _kind: "success",
      result: {
        abi: [],
        address: "0xAddr",
        bytecode: "0x0",
        name: "Foo",
      },
    });
  });

  it("should execute a library deploy", async () => {
    const fakeArtifact: Artifact = {
      contractName: "Foo",
      abi: [],
      bytecode: "0x0",
      linkReferences: {},
    };

    const contractDeploy: ExecutionVertex = {
      type: "LibraryDeploy",
      id: 0,
      label: "Foo",
      artifact: fakeArtifact,
      args: [1, "example"],
    };

    let actualArtifact: Artifact | undefined;
    let actualArgs: any[] | undefined;
    let actualLibraries: { [k: string]: any } | undefined;

    const mockServices = {
      ...getMockServices(),
      contracts: {
        deploy: async (
          artifact: Artifact,
          args: any[],
          libraries: { [k: string]: any },
          _txOptions?: TransactionOptions
        ): Promise<string> => {
          actualArtifact = artifact;
          actualArgs = args;
          actualLibraries = libraries;

          return "0x0";
        },
      } as any,
      transactions: {
        wait: (txHash: string) => {
          if (txHash !== "0x0") {
            assert.fail("Wrong transaction address");
          }

          return { contractAddress: "0xAddr" };
        },
      } as any,
    };

    const response = await assertExecuteSingleVertex(
      contractDeploy,
      mockServices
    );

    assert.deepStrictEqual(actualArtifact, fakeArtifact);
    assert.deepStrictEqual(actualArgs, contractDeploy.args);
    assert.deepStrictEqual(actualLibraries, {});

    assert.isDefined(response);
    if (response._kind === "failure") {
      return assert.fail("deploy failed");
    }

    assert.deepStrictEqual(response.result.get(0), {
      _kind: "success",
      result: {
        abi: [],
        address: "0xAddr",
        bytecode: "0x0",
        name: "Foo",
      },
    });
  });

  it("should execute a contract call", async () => {
    const fakeArtifact: Artifact = {
      contractName: "Foo",
      abi: [],
      bytecode: "0x0",
      linkReferences: {},
    };

    const contractDeploy: ExecutionVertex = {
      type: "ContractDeploy",
      id: 0,
      label: "Foo",
      artifact: fakeArtifact,
      args: [1, "example"],
      libraries: {
        Math: {} as any,
      },
    };

    const contractCall: ExecutionVertex = {
      type: "ContractCall",
      id: 1,
      label: "Foo",
      contract: { vertexId: 0, type: "contract", label: "Foo", _future: true },
      method: "inc",
      args: [1],
    };

    let calledAddress: string | undefined;
    let calledMethod: string | undefined;
    let calledArgs: any[] | undefined;

    const mockServices: Services = {
      ...getMockServices(),
      contracts: {
        deploy: async (): Promise<string> => {
          return "0x1";
        },
        call: async (
          address: string,
          _abi: any[],
          method: string,
          args: any[],
          _txOptions?: TransactionOptions
        ): Promise<string> => {
          calledAddress = address;
          calledMethod = method;
          calledArgs = args;
          return "0x2";
        },
      } as any,
      transactions: {
        wait: (txHash: string) => {
          if (txHash === "0x1") {
            return { contractAddress: "0xAddr1" };
          }

          return { contractAddress: "0xAddr2" };
        },
      } as any,
    };

    const response = await assertDependentVertex(
      contractDeploy,
      contractCall,
      mockServices
    );

    assert.deepStrictEqual(calledAddress, "0xAddr1");
    assert.deepStrictEqual(calledMethod, "inc");
    assert.deepStrictEqual(calledArgs, [1]);

    assert.isDefined(response);
    if (response._kind === "failure") {
      return assert.fail("deploy failed");
    }

    assert.deepStrictEqual(response.result.get(1), {
      _kind: "success",
      result: {
        hash: "0x2",
      },
    });
  });

  it("should ignore an already deployed contract", async () => {
    const contractDeploy: ExecutionVertex = {
      type: "DeployedContract",
      id: 0,
      label: "Foo",
      address: "0xAddr",
      abi: [],
    };

    const mockServices: Services = {
      ...getMockServices(),
      contracts: {
        deploy: async (): Promise<string> => {
          assert.fail("deploy should not be called");
        },
      } as any,
    };

    const response = await assertExecuteSingleVertex(
      contractDeploy,
      mockServices
    );

    assert.isDefined(response);
    if (response._kind === "failure") {
      return assert.fail("deploy failed");
    }

    assert.deepStrictEqual(response.result.get(0), {
      _kind: "success",
      result: {
        name: "Foo",
        abi: [],
        address: "0xAddr",
      },
    });
  });
});

async function assertExecuteSingleVertex(
  executionVertex: ExecutionVertex,
  mockServices: Services
) {
  const executionGraph = new ExecutionGraph();
  executionGraph.adjacencyList = buildAdjacencyListFrom({
    0: [],
  });
  executionGraph.vertexes.set(0, executionVertex);

  const mockUpdateUiAction = () => {};

  const deployment = new Deployment(
    { name: "MyRecipe" },
    mockServices,
    mockUpdateUiAction
  );

  deployment.state.transform.executionGraph = executionGraph;

  return execute(deployment);
}

async function assertDependentVertex(
  parent: ExecutionVertex,
  child: ExecutionVertex,
  mockServices: Services
) {
  const executionGraph = new ExecutionGraph();
  executionGraph.adjacencyList = buildAdjacencyListFrom({
    0: [1],
    1: [],
  });
  executionGraph.vertexes.set(0, parent);
  executionGraph.vertexes.set(1, child);

  const mockUpdateUiAction = () => {};

  const deployment = new Deployment(
    { name: "MyRecipe" },
    mockServices,
    mockUpdateUiAction
  );

  deployment.state.transform.executionGraph = executionGraph;

  return execute(deployment);
}
