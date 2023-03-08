/* eslint-disable import/no-unused-modules */
import { assert } from "chai";

import { buildModule } from "dsl/buildModule";
import { generateDeploymentGraphFrom } from "process/generateDeploymentGraphFrom";
import { IDeploymentBuilder, IDeploymentGraph } from "types/deploymentGraph";
import { isCall, isHardhatContract } from "utils/guards";

import { getDeploymentVertexByLabel } from "./helpers";

describe("deployment builder - getBytesForArtifact", () => {
  let deploymentGraph: IDeploymentGraph;

  before(() => {
    const callModule = buildModule("call", (m: IDeploymentBuilder) => {
      const exchange = m.contract("Exchange");
      const another = m.contract("Another");

      m.call(exchange, "addToken", {
        args: [m.getBytesForArtifact("Token")],
        after: [another],
      });

      return {};
    });

    const { graph } = generateDeploymentGraphFrom(callModule, {
      chainId: 31337,
      accounts: [],
    });

    deploymentGraph = graph;
  });

  it("should create a graph", () => {
    assert.isDefined(deploymentGraph);
  });

  it("should have three nodes", () => {
    assert.equal(deploymentGraph.vertexes.size, 3);
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
        label: "Token",
        type: "bytes",
        _future: true,
      },
    ]);
  });
});
