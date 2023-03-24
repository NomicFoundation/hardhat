/* eslint-disable import/no-unused-modules */
import { assert } from "chai";

import { buildModule } from "../../src/dsl/buildModule";
import { generateDeploymentGraphFrom } from "../../src/internal/process/generateDeploymentGraphFrom";
import {
  IDeploymentBuilder,
  IDeploymentGraph,
} from "../../src/internal/types/deploymentGraph";
import {
  isAwaitedEvent,
  isCall,
  isArtifactContract,
} from "../../src/internal/utils/guards";
import { ArtifactContract } from "../../src/types/future";

import {
  getDependenciesForVertex,
  getDeploymentVertexByLabel,
} from "./helpers";

const artifact = {
  contractName: "Token",
  abi: [
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "address",
          name: "sender",
          type: "address",
        },
        {
          indexed: false,
          internalType: "uint256",
          name: "value",
          type: "uint256",
        },
      ],
      name: "SomeEvent",
      type: "event",
    },
    {
      inputs: [],
      name: "test",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "num",
          type: "uint256",
        },
      ],
      name: "verify",
      outputs: [],
      stateMutability: "pure",
      type: "function",
    },
  ],
  bytecode:
    "608060405234801561001057600080fd5b5061019c806100206000396000f3fe608060405234801561001057600080fd5b50600436106100365760003560e01c80638753367f1461003b578063f8a8fd6d14610057575b600080fd5b610055600480360381019061005091906100d7565b610061565b005b61005f610071565b005b607b811461006e57600080fd5b50565b3073ffffffffffffffffffffffffffffffffffffffff167fdde371250dcd21c331edbb965b9163f4898566e8c60e28868533281edf66ab03607b6040516100b89190610113565b60405180910390a2565b6000813590506100d18161014f565b92915050565b6000602082840312156100ed576100ec61014a565b5b60006100fb848285016100c2565b91505092915050565b61010d81610138565b82525050565b60006020820190506101286000830184610104565b92915050565b6000819050919050565b60006101438261012e565b9050919050565b600080fd5b6101588161012e565b811461016357600080fd5b5056fea2646970667358221220feb2fe32fb60d1ce42ae5b67f1d29871608dc1e7f38f6abad28706024c3aa14864736f6c63430008070033",
  linkReferences: {},
};

describe("deployment builder - await event", () => {
  let deploymentGraph: IDeploymentGraph;

  before(() => {
    const eventModule = buildModule("event", (m: IDeploymentBuilder) => {
      const testContract = m.contract("Test", artifact);

      const call = m.call(testContract, "test", { args: [] });

      const event = m.event(testContract as ArtifactContract, "SomeEvent", {
        args: [testContract],
        after: [call],
      });

      m.call(testContract, "verify", {
        args: [event.params.value],
      });

      return {};
    });

    const { graph } = generateDeploymentGraphFrom(eventModule, {
      chainId: 31337,
      accounts: [],
    });

    deploymentGraph = graph;
  });

  it("should create a graph", () => {
    assert.isDefined(deploymentGraph);
  });

  it("should have four nodes", () => {
    assert.equal(deploymentGraph.vertexes.size, 4);
  });

  it("should have the contract node Test", () => {
    const depNode = getDeploymentVertexByLabel(deploymentGraph, "Test");

    if (depNode === undefined) {
      return assert.isDefined(depNode);
    }

    assert.equal(depNode?.label, "Test");
    assert(isArtifactContract(depNode));
  });

  it("should have the call node Test/test", () => {
    const depNode = getDeploymentVertexByLabel(deploymentGraph, "Test/test");

    if (depNode === undefined) {
      return assert.isDefined(depNode);
    }

    assert.equal(depNode?.label, "Test/test");
    assert(isCall(depNode));
  });

  it("should have the await event node Test/SomeEvent", () => {
    const depNode = getDeploymentVertexByLabel(
      deploymentGraph,
      "Test/SomeEvent"
    );

    if (depNode === undefined) {
      return assert.isDefined(depNode);
    }

    assert.equal(depNode?.label, "Test/SomeEvent");
    assert(isAwaitedEvent(depNode));
  });

  it("should have the call node Test/verify", () => {
    const depNode = getDeploymentVertexByLabel(deploymentGraph, "Test/verify");

    if (depNode === undefined) {
      return assert.isDefined(depNode);
    }

    assert.equal(depNode?.label, "Test/verify");
    assert(isCall(depNode));
  });

  it("should show no dependencies for the contract node Test", () => {
    const depNode = getDeploymentVertexByLabel(deploymentGraph, "Test");

    if (depNode === undefined) {
      return assert.isDefined(depNode);
    }

    const deps = getDependenciesForVertex(deploymentGraph, depNode);

    assert.deepStrictEqual(deps, []);
  });

  it("should show one dependency for the call node Test/test", () => {
    const depNode = getDeploymentVertexByLabel(deploymentGraph, "Test/test");

    if (depNode === undefined) {
      return assert.isDefined(depNode);
    }

    const deps = getDependenciesForVertex(deploymentGraph, depNode);

    assert.deepStrictEqual(deps, [
      {
        id: 0,
        label: "Test",
        type: "",
      },
    ]);
  });

  it("should show two dependencies for the event node Test/SomeEvent", () => {
    const depNode = getDeploymentVertexByLabel(
      deploymentGraph,
      "Test/SomeEvent"
    );

    if (depNode === undefined) {
      return assert.isDefined(depNode);
    }

    const deps = getDependenciesForVertex(deploymentGraph, depNode);

    assert.deepStrictEqual(deps, [
      {
        id: 0,
        label: "Test",
        type: "",
      },
      {
        id: 1,
        label: "Test/test",
        type: "",
      },
    ]);
  });

  it("should show two dependencies for the call node Test/verify", () => {
    const depNode = getDeploymentVertexByLabel(deploymentGraph, "Test/verify");

    if (depNode === undefined) {
      return assert.isDefined(depNode);
    }

    const deps = getDependenciesForVertex(deploymentGraph, depNode);

    assert.deepStrictEqual(deps, [
      {
        id: 0,
        label: "Test",
        type: "",
      },
      {
        id: 2,
        label: "Test/SomeEvent",
        type: "",
      },
    ]);
  });

  it("should record the argument list for the contract node Test as empty", () => {
    const depNode = getDeploymentVertexByLabel(deploymentGraph, "Test");

    if (depNode === undefined) {
      return assert.isDefined(depNode);
    }

    if (!isArtifactContract(depNode)) {
      return assert.fail("Not a hardhat contract dependency node");
    }

    assert.deepStrictEqual(depNode.args, []);
  });

  it("should record the argument list for the call node Test/test as empty", () => {
    const depNode = getDeploymentVertexByLabel(deploymentGraph, "Test/test");

    if (depNode === undefined) {
      return assert.isDefined(depNode);
    }

    if (!isCall(depNode)) {
      return assert.fail("Not a call dependency node");
    }

    assert.deepStrictEqual(depNode.args, []);
  });

  it("should record the argument list for the event node Test/SomeEvent", () => {
    const depNode = getDeploymentVertexByLabel(
      deploymentGraph,
      "Test/SomeEvent"
    );

    if (depNode === undefined) {
      return assert.isDefined(depNode);
    }

    if (!isAwaitedEvent(depNode)) {
      return assert.fail("Not an awaited event dependency node");
    }

    assert.deepStrictEqual(depNode.args, [
      {
        vertexId: 0,
        label: "Test",
        type: "contract",
        subtype: "artifact",
        artifact,
        _future: true,
      },
    ]);
  });

  it("should record the argument list for the call node Test/verify", () => {
    const depNode = getDeploymentVertexByLabel(deploymentGraph, "Test/verify");

    if (depNode === undefined) {
      return assert.isDefined(depNode);
    }

    if (!isCall(depNode)) {
      return assert.fail("Not a call dependency node");
    }

    assert.deepStrictEqual(depNode.args, [
      {
        vertexId: 2,
        label: "value",
        type: "eventParam",
        subtype: "uint256",
        _future: true,
      },
    ]);
  });
});
