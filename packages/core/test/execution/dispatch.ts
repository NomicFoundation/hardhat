/* eslint-disable import/no-unused-modules */
import { assert } from "chai";
import { ethers } from "ethers";
import sinon from "sinon";

import { Deployment } from "../../src/internal/deployment/Deployment";
import { ExecutionGraph } from "../../src/internal/execution/ExecutionGraph";
import { execute } from "../../src/internal/execution/execute";
import { ExecutionVertex } from "../../src/internal/types/executionGraph";
import {
  VertexResultEnum,
  VisitResultState,
} from "../../src/internal/types/graph";
import { ICommandJournal } from "../../src/internal/types/journal";
import {
  Services,
  TransactionOptions,
} from "../../src/internal/types/services";
import { Artifact } from "../../src/types/hardhat";
import { buildAdjacencyListFrom } from "../graph/helpers";
import { getMockServices } from "../helpers";

const ACCOUNT_0 = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

describe("Execution - dispatch", () => {
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
      signer: new ethers.VoidSigner(
        "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266"
      ),
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

    const response = await runExecuteOnSingleVertex(
      contractDeploy,
      mockServices
    );

    assert.isDefined(response);

    if (response._kind !== VisitResultState.SUCCESS) {
      return assert.fail("deploy failed");
    }

    assert.deepStrictEqual(response.result.get(0), {
      _kind: VertexResultEnum.SUCCESS,
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
      signer: new ethers.VoidSigner(
        "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266"
      ),
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

    const response = await runExecuteOnSingleVertex(
      contractDeploy,
      mockServices
    );

    assert.isDefined(response);
    if (response._kind !== VisitResultState.SUCCESS) {
      return assert.fail("deploy failed");
    }

    assert.deepStrictEqual(response.result.get(0), {
      _kind: VertexResultEnum.SUCCESS,
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
      value: ethers.utils.parseUnits("0"),
      signer: new ethers.VoidSigner(
        "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266"
      ),
    };

    const contractCall: ExecutionVertex = {
      type: "ContractCall",
      id: 1,
      label: "Foo",
      contract: { vertexId: 0, type: "contract", label: "Foo", _future: true },
      method: "inc",
      args: [1],
      value: ethers.utils.parseUnits("0"),
      signer: new ethers.VoidSigner(
        "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266"
      ),
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

    const response = await runExecuteOnDependentVertex(
      [contractDeploy, contractCall],
      mockServices
    );

    assert.isDefined(response);
    if (response._kind !== VisitResultState.SUCCESS) {
      return assert.fail("deploy failed");
    }

    assert.deepStrictEqual(response.result.get(1), {
      _kind: VertexResultEnum.SUCCESS,
      result: {
        hash: "0x2",
      },
    });
  });

  describe("await event", () => {
    let contractDeploy: ExecutionVertex;
    let contractCall: ExecutionVertex;
    let awaitedEvent: ExecutionVertex;
    let mockServices: Services;

    beforeEach(() => {
      const fakeArtifact = {
        contractName: "Test",
        abi: [
          {
            type: "event",
            name: "SomeEvent",
            anonymous: false,
            inputs: [
              {
                indexed: true,
                internalType: "address",
                name: "sender",
                type: "address",
              },
            ],
          },
          {
            inputs: [],
            name: "test",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function",
          },
        ],
        bytecode:
          "6080604052348015600f57600080fd5b5060b08061001e6000396000f3fe6080604052348015600f57600080fd5b506004361060285760003560e01c8063f8a8fd6d14602d575b600080fd5b60336035565b005b3373ffffffffffffffffffffffffffffffffffffffff167f62e1088ac332ffa611ac64bd5a2aef2c27de42d3c61c686ec5c53753c35c7f6860405160405180910390a256fea2646970667358221220a77b6f6bba99fe90fc34a87656ffff1d3703a60de09e70feb2a64ed1dee0862264736f6c63430008070033",
        linkReferences: {},
      };

      contractDeploy = {
        type: "ContractDeploy",
        id: 0,
        label: "Test",
        artifact: fakeArtifact,
        args: [],
        libraries: {},
        value: ethers.utils.parseUnits("0"),
        signer: new ethers.VoidSigner(
          "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266"
        ),
      };

      contractCall = {
        type: "ContractCall",
        id: 1,
        label: "Test/test",
        contract: {
          vertexId: 0,
          type: "contract",
          label: "Test",
          _future: true,
        },
        method: "test",
        args: [],
        value: ethers.utils.parseUnits("0"),
        signer: new ethers.VoidSigner(
          "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266"
        ),
      };

      awaitedEvent = {
        type: "AwaitedEvent",
        id: 2,
        abi: fakeArtifact.abi,
        address: {
          vertexId: 0,
          type: "contract",
          subtype: "artifact",
          artifact: fakeArtifact,
          label: "Test",
          _future: true,
        },
        label: "Test/SomeEvent",
        event: "SomeEvent",
        args: [ACCOUNT_0],
      };

      const iface = new ethers.utils.Interface(fakeArtifact.abi);

      const fakeLog = iface.encodeEventLog(
        ethers.utils.EventFragment.from(fakeArtifact.abi[0]),
        ["0x0000000000000000000000000000000000000003"]
      );

      const sendTxStub = sinon.stub();
      sendTxStub.onCall(0).resolves("0x1");
      sendTxStub.onCall(1).resolves("0x2");

      const waitForEventStub = sinon.stub();
      waitForEventStub.onFirstCall().resolves(fakeLog);

      mockServices = {
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
          waitForEvent: waitForEventStub,
        } as any,
      };
    });

    it("should return the result of an awaited event that completes within the timeout", async () => {
      const response = await runExecuteOnDependentVertex(
        [contractDeploy, contractCall, awaitedEvent],
        mockServices
      );

      if (response._kind !== VisitResultState.SUCCESS) {
        return assert.fail("deploy failed");
      }

      assert.deepStrictEqual(response.result.get(2), {
        _kind: VertexResultEnum.SUCCESS,
        result: {
          topics: ["0x0000000000000000000000000000000000000003"],
        },
      });
    });

    it("should return as on hold if an awaited event is not detected within the timeout", async () => {
      const response = await runExecuteOnDependentVertex(
        [contractDeploy, awaitedEvent],
        {
          ...mockServices,
          transactions: {
            ...mockServices.transactions,
            waitForEvent: sinon.stub().resolves(null),
          },
        }
      );

      assert(
        response._kind === VisitResultState.HOLD,
        `response should be hold, not: ${response._kind}`
      );
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
        deploy: async (): Promise<void> => {
          assert.fail("deploy should not be called");
        },
      } as any,
    };

    const response = await runExecuteOnSingleVertex(
      contractDeploy,
      mockServices
    );

    assert.isDefined(response);
    if (response._kind !== VisitResultState.SUCCESS) {
      return assert.fail("deploy failed");
    }

    assert.deepStrictEqual(response.result.get(0), {
      _kind: VertexResultEnum.SUCCESS,
      result: {
        name: "Foo",
        abi: [],
        address: "0xAddr",
      },
    });
  });
});

async function runExecuteOnSingleVertex(
  executionVertex: ExecutionVertex,
  mockServices: Services
) {
  const executionGraph = new ExecutionGraph();
  executionGraph.adjacencyList = buildAdjacencyListFrom({
    0: [],
  });
  executionGraph.vertexes.set(0, executionVertex);

  const mockUpdateUiAction = () => {};
  const mockJournal: ICommandJournal = {
    record: async () => {},
    async *read() {},
  };

  const deployment = new Deployment(
    "MyModule",
    mockServices,
    mockJournal,
    mockUpdateUiAction
  );

  deployment.state.transform.executionGraph = executionGraph;

  return execute(deployment, {} as any);
}

async function runExecuteOnDependentVertex(
  vertexes: ExecutionVertex[],
  mockServices: Services
) {
  const obj: { [key: number]: number[] } = {};
  const len = vertexes.length;
  for (let i = 0; i < len; i++) {
    obj[i] = i === len - 1 ? [] : [i + 1];
  }

  const executionGraph = new ExecutionGraph();
  executionGraph.adjacencyList = buildAdjacencyListFrom(obj);

  vertexes.forEach((vertex, i) => {
    executionGraph.vertexes.set(i, vertex);
  });

  const mockUpdateUiAction = () => {};
  const mockJournal: ICommandJournal = {
    record: async () => {},
    async *read() {},
  };

  const deployment = new Deployment(
    "MyModule",
    mockServices,
    mockJournal,
    mockUpdateUiAction
  );

  deployment.state.transform.executionGraph = executionGraph;

  return execute(deployment, {} as any);
}
