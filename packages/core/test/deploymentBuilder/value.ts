/* eslint-disable import/no-unused-modules */
import { assert } from "chai";
import { ethers } from "ethers";

import { buildModule } from "dsl/buildModule";
import { generateDeploymentGraphFrom } from "process/generateDeploymentGraphFrom";
import type {
  IDeploymentGraph,
  IDeploymentBuilder,
} from "types/deploymentGraph";
import type { Artifact } from "types/hardhat";
import { isArtifactContract, isHardhatContract, isCall } from "utils/guards";

import { getDeploymentVertexByLabel } from "./helpers";

describe("deployment builder - value", () => {
  let deploymentGraph: IDeploymentGraph;

  before(() => {
    const artifact = { abi: [], bytecode: "xxx" } as any as Artifact;

    const callModule = buildModule("call", (m: IDeploymentBuilder) => {
      const token = m.contract("Token");
      const exchange = m.contract("Exchange", {
        value: ethers.utils.parseUnits("42"),
      });

      m.call(exchange, "addToken", {
        args: [token],
        value: ethers.utils.parseUnits("10"),
      });

      const foo = m.contract("Foo", artifact, {
        args: [0],
        value: ethers.utils.parseUnits("3"),
      });

      return { foo };
    });

    const { graph } = generateDeploymentGraphFrom(callModule, {
      chainId: 31337,
      accounts: [],
    });

    deploymentGraph = graph;
  });

  it("should default to zero value if not given a value parameter", () => {
    const depNode = getDeploymentVertexByLabel(deploymentGraph, "Token");

    assert.isDefined(depNode);
    if (!isHardhatContract(depNode)) {
      return assert.fail("unknown error");
    }

    assert.equal(
      depNode.value.toString(),
      ethers.utils.parseUnits("0").toString()
    );
  });

  describe("contract", () => {
    it("should deploy with a given value", () => {
      const depNode = getDeploymentVertexByLabel(deploymentGraph, "Exchange");

      assert.isDefined(depNode);
      if (!isHardhatContract(depNode)) {
        return assert.fail("unknown error");
      }

      assert.equal(
        depNode.value.toString(),
        ethers.utils.parseUnits("42").toString()
      );
    });
  });

  describe("call", () => {
    it("should deploy with a given value", () => {
      const depNode = getDeploymentVertexByLabel(
        deploymentGraph,
        "Exchange/addToken"
      );

      assert.isDefined(depNode);
      if (!isCall(depNode)) {
        return assert.fail("unknown error");
      }

      assert.equal(
        depNode.value.toString(),
        ethers.utils.parseUnits("10").toString()
      );
    });
  });

  describe("artifact", () => {
    it("should deploy with a given value", () => {
      const depNode = getDeploymentVertexByLabel(deploymentGraph, "Foo");

      assert.isDefined(depNode);
      if (!isArtifactContract(depNode)) {
        return assert.fail("unknown error");
      }

      assert.equal(
        depNode.value.toString(),
        ethers.utils.parseUnits("3").toString()
      );
    });
  });
});
