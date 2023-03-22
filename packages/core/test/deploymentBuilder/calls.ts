/* eslint-disable import/no-unused-modules */
import { assert } from "chai";

import { buildModule } from "../../src/dsl/buildModule";
import { generateDeploymentGraphFrom } from "../../src/internal/process/generateDeploymentGraphFrom";
import {
  IDeploymentBuilder,
  IDeploymentGraph,
} from "../../src/internal/types/deploymentGraph";
import { isCall, isHardhatContract } from "../../src/internal/utils/guards";

import {
  getDependenciesForVertex,
  getDeploymentVertexByLabel,
} from "./helpers";

describe("deployment builder - chainId", () => {
  let deploymentGraph: IDeploymentGraph;

  before(() => {
    const callModule = buildModule("call", (m: IDeploymentBuilder) => {
      const token = m.contract("Token");
      const exchange = m.contract("Exchange");
      const another = m.contract("Another");

      m.call(exchange, "addToken", {
        args: [token],
        after: [another],
        from: m.accounts[0],
      });

      return {};
    });

    const { graph } = generateDeploymentGraphFrom(callModule, {
      chainId: 31337,
      accounts: ["0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"],
      artifacts: [],
    });

    deploymentGraph = graph;
  });

  it("should create a graph", () => {
    assert.isDefined(deploymentGraph);
  });

  it("should have four nodes", () => {
    assert.equal(deploymentGraph.vertexes.size, 4);
  });

  it("should have the contract node Token", () => {
    const depNode = getDeploymentVertexByLabel(deploymentGraph, "Token");

    if (depNode === undefined) {
      return assert.isDefined(depNode);
    }
    assert.equal(depNode?.label, "Token");
    assert(isHardhatContract(depNode));
  });

  it("should have the contract node Exchange", () => {
    const depNode = getDeploymentVertexByLabel(deploymentGraph, "Exchange");

    if (depNode === undefined) {
      return assert.isDefined(depNode);
    }

    assert.equal(depNode?.label, "Exchange");
    assert(isHardhatContract(depNode));
  });

  it("should have the call node Exchange/addToken", () => {
    const depNode = getDeploymentVertexByLabel(
      deploymentGraph,
      "Exchange/addToken"
    );

    if (depNode === undefined) {
      return assert.isDefined(depNode);
    }

    assert.equal(depNode?.label, "Exchange/addToken");
    assert(isCall(depNode));
  });

  it("should show no dependencies for the contract node Token", () => {
    const depNode = getDeploymentVertexByLabel(deploymentGraph, "Token");

    if (depNode === undefined) {
      return assert.isDefined(depNode);
    }

    const deps = getDependenciesForVertex(deploymentGraph, depNode);

    assert.deepStrictEqual(deps, []);
  });

  it("should show no dependencies for the contract node Exchange", () => {
    const depNode = getDeploymentVertexByLabel(deploymentGraph, "Exchange");

    if (depNode === undefined) {
      return assert.isDefined(depNode);
    }

    const deps = getDependenciesForVertex(deploymentGraph, depNode);

    assert.deepStrictEqual(deps, []);
  });

  it("should show three dependencies for the call node Exchange/addToken", () => {
    const depNode = getDeploymentVertexByLabel(
      deploymentGraph,
      "Exchange/addToken"
    );

    if (depNode === undefined) {
      return assert.isDefined(depNode);
    }

    const deps = getDependenciesForVertex(deploymentGraph, depNode);

    assert.deepStrictEqual(deps, [
      {
        id: 0,
        label: "Token",
        type: "",
      },
      { id: 1, label: "Exchange", type: "" },
      { id: 2, label: "Another", type: "" },
    ]);
  });

  it("should record the argument list for the contract node Token as empty", () => {
    const depNode = getDeploymentVertexByLabel(deploymentGraph, "Token");

    if (depNode === undefined) {
      return assert.isDefined(depNode);
    }

    if (!isHardhatContract(depNode)) {
      return assert.fail("Not a hardhat contract dependency node");
    }

    assert.deepStrictEqual(depNode.args, []);
  });

  it("should record the argument list for the contract node Exchange as empty", () => {
    const depNode = getDeploymentVertexByLabel(deploymentGraph, "Exchange");

    if (depNode === undefined) {
      return assert.isDefined(depNode);
    }

    if (!isHardhatContract(depNode)) {
      return assert.fail("Not a hardhat contract dependency node");
    }

    assert.deepStrictEqual(depNode.args, []);
  });

  it("should record the argument list for the call node Exchange at Exchange/addToken", () => {
    const depNode = getDeploymentVertexByLabel(
      deploymentGraph,
      "Exchange/addToken"
    );

    if (depNode === undefined) {
      return assert.isDefined(depNode);
    }

    if (!isCall(depNode)) {
      return assert.fail("Not a call dependency node");
    }

    assert.deepStrictEqual(depNode.args, [
      {
        vertexId: 0,
        label: "Token",
        type: "contract",
        subtype: "hardhat",
        contractName: "Token",
        _future: true,
      },
    ]);
  });

  it("should record the address to send from for the call node Exchange at Exchange/addToken", () => {
    const depNode = getDeploymentVertexByLabel(
      deploymentGraph,
      "Exchange/addToken"
    );

    if (depNode === undefined) {
      return assert.isDefined(depNode);
    }

    if (!isCall(depNode)) {
      return assert.fail("Not a call dependency node");
    }

    assert.equal(depNode.from, "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266");
  });
});
