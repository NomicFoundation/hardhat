/* eslint-disable import/no-unused-modules */
import { assert } from "chai";
import { ethers } from "ethers";

import { buildModule } from "../../src/dsl/buildModule";
import { generateDeploymentGraphFrom } from "../../src/internal/process/generateDeploymentGraphFrom";
import {
  IDeploymentBuilder,
  IDeploymentGraph,
} from "../../src/internal/types/deploymentGraph";
import { isHardhatContract } from "../../src/internal/utils/guards";

import {
  getDependenciesForVertex,
  getDeploymentVertexByLabel,
} from "./helpers";

describe("deployment builder - send ETH", () => {
  let deploymentGraph: IDeploymentGraph;

  before(() => {
    const sendModule = buildModule("send", (m: IDeploymentBuilder) => {
      const token = m.contract("Token");
      const value = ethers.utils.parseUnits("10");

      m.sendETH(token, { value, after: [token], from: m.accounts[0] });

      return {};
    });

    const { graph } = generateDeploymentGraphFrom(sendModule, {
      chainId: 31337,
      accounts: ["0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"],
      artifacts: [],
    });

    deploymentGraph = graph;
  });

  it("should create a graph", () => {
    assert.isDefined(deploymentGraph);
  });

  it("should have two nodes", () => {
    assert.equal(deploymentGraph.vertexes.size, 2);
  });

  it("should have the contract node Token", () => {
    const depNode = getDeploymentVertexByLabel(deploymentGraph, "Token");

    if (depNode === undefined) {
      return assert.isDefined(depNode);
    }
    assert.equal(depNode?.label, "Token");
    assert(isHardhatContract(depNode));
  });

  it("should have the send node send/1", () => {
    const depNode = getDeploymentVertexByLabel(deploymentGraph, "send/1");

    if (depNode === undefined) {
      return assert.isDefined(depNode);
    }

    assert.equal(depNode?.label, "send/1");
    assert(depNode.type === "SendETH");
  });

  it("should show no dependencies for the contract node Token", () => {
    const depNode = getDeploymentVertexByLabel(deploymentGraph, "Token");

    if (depNode === undefined) {
      return assert.isDefined(depNode);
    }

    const deps = getDependenciesForVertex(deploymentGraph, depNode);

    assert.deepStrictEqual(deps, []);
  });

  it("should show 1 dependency for the send node send/1", () => {
    const depNode = getDeploymentVertexByLabel(deploymentGraph, "send/1");

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

  it("should record the correct address to send from", () => {
    const depNode = getDeploymentVertexByLabel(deploymentGraph, "Token");

    if (depNode === undefined) {
      return assert.isDefined(depNode);
    }

    if (!isHardhatContract(depNode)) {
      return assert.fail("Not a hardhat contract dependency node");
    }

    assert.equal(depNode.from, "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266");
  });
});
