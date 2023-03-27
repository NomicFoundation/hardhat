/* eslint-disable import/no-unused-modules */
import type {
  IDeploymentGraph,
  IDeploymentBuilder,
} from "../../src/internal/types/deploymentGraph";
import type { Artifact } from "../../src/types/hardhat";

import { assert } from "chai";
import { ethers } from "ethers";

import { buildModule } from "../../src/dsl/buildModule";
import { generateDeploymentGraphFrom } from "../../src/internal/process/generateDeploymentGraphFrom";
import {
  isArtifactContract,
  isHardhatContract,
  isCall,
} from "../../src/internal/utils/guards";

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
      artifacts: [],
    });

    deploymentGraph = graph;
  });

  it("should default to zero value if not given a value parameter", () => {
    const depNode = getDeploymentVertexByLabel(deploymentGraph, "Token");

    if (depNode === undefined) {
      assert.fail("depNode not returned");
    }

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

      if (depNode === undefined) {
        assert.fail("depNode not returned");
      }

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

      if (depNode === undefined) {
        assert.fail("depNode not returned");
      }

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

      if (depNode === undefined) {
        assert.fail("depNode not returned");
      }

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
