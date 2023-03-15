/* eslint-disable import/no-unused-modules */
import type {
  IDeploymentGraph,
  IDeploymentBuilder,
} from "../../src/types/deploymentGraph";

import { assert } from "chai";
import { ethers } from "ethers";

import { buildModule } from "../../src/dsl/buildModule";
import { generateDeploymentGraphFrom } from "../../src/process/generateDeploymentGraphFrom";
import { isCall, isHardhatContract } from "../../src/utils/guards";

import { getDeploymentVertexByLabel } from "./helpers";

describe("deployment builder - accounts", () => {
  let deploymentGraph: IDeploymentGraph;

  before(() => {
    const accountsModule = buildModule("accounts", (m: IDeploymentBuilder) => {
      const token = m.contract("Token");
      const exchange = m.contract("Exchange", {
        from: m.accounts[1],
      });

      m.call(exchange, "addToken", {
        args: [token],
        value: ethers.utils.parseUnits("10"),
        from: m.accounts[1],
      });

      return { token, exchange };
    });

    const { graph } = generateDeploymentGraphFrom(accountsModule, {
      chainId: 31337,
      accounts: [
        "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
        "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      ],
    });

    deploymentGraph = graph;
  });

  it("should default to the first account if not given a from parameter", () => {
    const depNode = getDeploymentVertexByLabel(deploymentGraph, "Token");

    if (depNode === undefined) {
      return assert.fail("depNode not retrieved");
    }

    if (!isHardhatContract(depNode)) {
      return assert.fail("unknown error");
    }

    assert.equal(depNode.from, "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266");
  });

  it("should deploy with a given from address", () => {
    const depNode = getDeploymentVertexByLabel(deploymentGraph, "Exchange");

    if (depNode === undefined) {
      return assert.fail("depNode not retrieved");
    }

    if (!isHardhatContract(depNode)) {
      return assert.fail("unknown error");
    }

    assert.equal(depNode.from, "0x70997970C51812dc3A010C7d01b50e0d17dc79C8");
  });

  it("should call a function with a given from address", () => {
    const depNode = getDeploymentVertexByLabel(
      deploymentGraph,
      "Exchange/addToken"
    );

    if (depNode === undefined) {
      return assert.fail("depNode not retrieved");
    }

    if (!isCall(depNode)) {
      return assert.fail("unknown error");
    }

    assert.equal(depNode.from, "0x70997970C51812dc3A010C7d01b50e0d17dc79C8");
  });
});
