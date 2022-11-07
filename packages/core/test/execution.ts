/* eslint-disable import/no-unused-modules */
import { assert } from "chai";
import { ethers } from "ethers";
import sinon from "sinon";

import { Deployment } from "deployment/Deployment";
import { ExecutionGraph } from "execution/ExecutionGraph";
import { execute } from "execution/execute";
import { Services, TransactionOptions } from "services/types";
import { ExecutionVertex } from "types/executionGraph";
import { Artifact } from "types/hardhat";

import { buildAdjacencyListFrom } from "./graph/helpers";
import { getMockServices } from "./helpers";

describe("Execution", () => {
  afterEach(() => {
    sinon.restore();
  });

  it("should execute a contract deploy", async () => {
    const fakeArtifact: Artifact = {
      contractName: "Foo",
      abi: [],
      bytecode:
        "6080604052600a60005534801561001557600080fd5b506102a3806100256000396000f3fe608060405234801561001057600080fd5b50600436106100365760003560e01c80630c55699c1461003b578063812600df14610059575b600080fd5b610043610075565b604051610050919061016d565b60405180910390f35b610073600480360381019061006e91906100ee565b61007b565b005b60005481565b600081116100be576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016100b59061014d565b60405180910390fd5b806000808282546100cf9190610199565b9250508190555050565b6000813590506100e881610256565b92915050565b60006020828403121561010457610103610228565b5b6000610112848285016100d9565b91505092915050565b6000610128601283610188565b91506101338261022d565b602082019050919050565b610147816101ef565b82525050565b600060208201905081810360008301526101668161011b565b9050919050565b6000602082019050610182600083018461013e565b92915050565b600082825260208201905092915050565b60006101a4826101ef565b91506101af836101ef565b9250827fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff038211156101e4576101e36101f9565b5b828201905092915050565b6000819050919050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052601160045260246000fd5b600080fd5b7f6e206d75737420626520706f7369746976650000000000000000000000000000600082015250565b61025f816101ef565b811461026a57600080fd5b5056fea2646970667358221220cc04d844f616d44488d76bfdbc831ad25ac2a62a3638e3e6b184ac61b359372264736f6c63430008050033",
      linkReferences: {},
    };

    const contractDeploy: ExecutionVertex = {
      type: "ContractDeploy",
      id: 0,
      label: "Foo",
      artifact: fakeArtifact,
      args: [],
      libraries: {},
      value: ethers.utils.parseUnits("0"),
    };

    const mockServices = {
      ...getMockServices(),
      contracts: {
        sendTx: async (
          _deployedTx: ethers.providers.TransactionRequest,
          _txOptions?: TransactionOptions
        ): Promise<string> => {
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

    assert.isDefined(response);
    if (response._kind === "failure") {
      return assert.fail("deploy failed");
    }

    assert.deepStrictEqual(response.result.get(0), {
      _kind: "success",
      result: {
        abi: [],
        address: "0xAddr",
        bytecode: fakeArtifact.bytecode,
        name: "Foo",
        value: ethers.utils.parseUnits("0"),
      },
    });
  });

  it("should execute a library deploy", async () => {
    const fakeArtifact: Artifact = {
      contractName: "Foo",
      abi: [],
      bytecode:
        "6080604052600a60005534801561001557600080fd5b506102a3806100256000396000f3fe608060405234801561001057600080fd5b50600436106100365760003560e01c80630c55699c1461003b578063812600df14610059575b600080fd5b610043610075565b604051610050919061016d565b60405180910390f35b610073600480360381019061006e91906100ee565b61007b565b005b60005481565b600081116100be576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016100b59061014d565b60405180910390fd5b806000808282546100cf9190610199565b9250508190555050565b6000813590506100e881610256565b92915050565b60006020828403121561010457610103610228565b5b6000610112848285016100d9565b91505092915050565b6000610128601283610188565b91506101338261022d565b602082019050919050565b610147816101ef565b82525050565b600060208201905081810360008301526101668161011b565b9050919050565b6000602082019050610182600083018461013e565b92915050565b600082825260208201905092915050565b60006101a4826101ef565b91506101af836101ef565b9250827fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff038211156101e4576101e36101f9565b5b828201905092915050565b6000819050919050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052601160045260246000fd5b600080fd5b7f6e206d75737420626520706f7369746976650000000000000000000000000000600082015250565b61025f816101ef565b811461026a57600080fd5b5056fea2646970667358221220cc04d844f616d44488d76bfdbc831ad25ac2a62a3638e3e6b184ac61b359372264736f6c63430008050033",
      linkReferences: {},
    };

    const contractDeploy: ExecutionVertex = {
      type: "LibraryDeploy",
      id: 0,
      label: "Foo",
      artifact: fakeArtifact,
      args: [],
    };

    const mockServices = {
      ...getMockServices(),
      contracts: {
        sendTx: async (
          _deployedTx: ethers.providers.TransactionRequest,
          _txOptions?: TransactionOptions
        ): Promise<string> => {
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

    assert.isDefined(response);
    if (response._kind === "failure") {
      return assert.fail("deploy failed");
    }

    assert.deepStrictEqual(response.result.get(0), {
      _kind: "success",
      result: {
        abi: [],
        address: "0xAddr",
        bytecode: fakeArtifact.bytecode,
        name: "Foo",
      },
    });
  });

  it("should execute a contract call", async () => {
    const fakeArtifact: Artifact = {
      contractName: "Foo",
      abi: [
        {
          inputs: [
            {
              internalType: "uint256",
              name: "n",
              type: "uint256",
            },
          ],
          name: "inc",
          outputs: [],
          stateMutability: "nonpayable",
          type: "function",
        },
        {
          inputs: [],
          name: "x",
          outputs: [
            {
              internalType: "uint256",
              name: "",
              type: "uint256",
            },
          ],
          stateMutability: "view",
          type: "function",
        },
      ],
      bytecode:
        "0x6080604052600a60005534801561001557600080fd5b506102a3806100256000396000f3fe608060405234801561001057600080fd5b50600436106100365760003560e01c80630c55699c1461003b578063812600df14610059575b600080fd5b610043610075565b604051610050919061016d565b60405180910390f35b610073600480360381019061006e91906100ee565b61007b565b005b60005481565b600081116100be576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016100b59061014d565b60405180910390fd5b806000808282546100cf9190610199565b9250508190555050565b6000813590506100e881610256565b92915050565b60006020828403121561010457610103610228565b5b6000610112848285016100d9565b91505092915050565b6000610128601283610188565b91506101338261022d565b602082019050919050565b610147816101ef565b82525050565b600060208201905081810360008301526101668161011b565b9050919050565b6000602082019050610182600083018461013e565b92915050565b600082825260208201905092915050565b60006101a4826101ef565b91506101af836101ef565b9250827fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff038211156101e4576101e36101f9565b5b828201905092915050565b6000819050919050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052601160045260246000fd5b600080fd5b7f6e206d75737420626520706f7369746976650000000000000000000000000000600082015250565b61025f816101ef565b811461026a57600080fd5b5056fea2646970667358221220cc04d844f616d44488d76bfdbc831ad25ac2a62a3638e3e6b184ac61b359372264736f6c63430008050033",
      linkReferences: {},
    };

    const contractDeploy: ExecutionVertex = {
      type: "ContractDeploy",
      id: 0,
      label: "Foo",
      artifact: fakeArtifact,
      args: [],
      libraries: {},
    };

    const contractCall: ExecutionVertex = {
      type: "ContractCall",
      id: 1,
      label: "Foo",
      contract: { vertexId: 0, type: "contract", label: "Foo", _future: true },
      method: "inc",
      args: [1],
    };

    const sendTxStub = sinon.stub();
    sendTxStub.onCall(0).resolves("0x1");
    sendTxStub.onCall(1).resolves("0x2");

    const mockServices: Services = {
      ...getMockServices(),
      contracts: {
        sendTx: sendTxStub,
      } as any,
      transactions: {
        wait: (txHash: string) => {
          if (txHash === "0x1") {
            return {
              contractAddress: "0x0000000000000000000000000000000000000001",
            };
          }

          return {
            contractAddress: "0x0000000000000000000000000000000000000002",
          };
        },
      } as any,
    };

    const response = await assertDependentVertex(
      contractDeploy,
      contractCall,
      mockServices
    );

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
    "MyModule",
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
    "MyModule",
    mockServices,
    mockUpdateUiAction
  );

  deployment.state.transform.executionGraph = executionGraph;

  return execute(deployment);
}
