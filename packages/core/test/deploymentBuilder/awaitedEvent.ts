/* eslint-disable import/no-unused-modules */
import { assert } from "chai";

import { buildModule } from "dsl/buildModule";
import { generateDeploymentGraphFrom } from "process/generateDeploymentGraphFrom";
import { IDeploymentBuilder, IDeploymentGraph } from "types/deploymentGraph";
import { isAwaitedEvent, isCall, isHardhatContract } from "utils/guards";

import {
  getDependenciesForVertex,
  getDeploymentVertexByLabel,
} from "./helpers";

describe("deployment builder - await event", () => {
  let deploymentGraph: IDeploymentGraph;

  before(() => {
    const eventModule = buildModule("event", (m: IDeploymentBuilder) => {
      const token = m.contract("Token");
      const exchange = m.contract("Exchange");
      const another = m.contract("Another");

      const call = m.call(exchange, "addToken", {
        args: [token],
        after: [another],
      });

      m.awaitEvent(token, "Transfer", { args: [token], after: [call] });

      return {};
    });

    const { graph } = generateDeploymentGraphFrom(eventModule, {
      chainId: 31337,
    });

    deploymentGraph = graph;
  });

  it("should create a graph", () => {
    assert.isDefined(deploymentGraph);
  });

  it("should have five nodes", () => {
    assert.equal(deploymentGraph.vertexes.size, 5);
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

  it("should have the await event node Token/Transfer", () => {
    const depNode = getDeploymentVertexByLabel(
      deploymentGraph,
      "Token/Transfer"
    );

    if (depNode === undefined) {
      return assert.isDefined(depNode);
    }

    assert.equal(depNode?.label, "Token/Transfer");
    assert(isAwaitedEvent(depNode));
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

  it("should show two dependencies for the call node Token/Transfer", () => {
    const depNode = getDeploymentVertexByLabel(
      deploymentGraph,
      "Token/Transfer"
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
      {
        id: 3,
        label: "Exchange/addToken",
        type: "",
      },
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

  it("should record the argument list for the event node Token at Token/Transfer", () => {
    const depNode = getDeploymentVertexByLabel(
      deploymentGraph,
      "Token/Transfer"
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
        label: "Token",
        type: "contract",
        subtype: "hardhat",
        contractName: "Token",
        _future: true,
      },
    ]);
  });
});
