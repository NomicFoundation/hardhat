/* eslint-disable import/no-unused-modules */
import { assert } from "chai";
import { ethers } from "ethers";

import { buildModule } from "dsl/buildModule";
import { generateDeploymentGraphFrom } from "process/generateDeploymentGraphFrom";
import type {
  IDeploymentGraph,
  IDeploymentBuilder,
  HardhatContractDeploymentVertex,
  CallDeploymentVertex,
  ArtifactContractDeploymentVertex,
} from "types/deploymentGraph";
import type { Artifact } from "types/hardhat";

import { getDeploymentVertexByLabel } from "./helpers";

function isHardhatContract(d: {
  type: string;
}): d is HardhatContractDeploymentVertex {
  return d.type === "HardhatContract";
}

function isHardhatCall(d: { type: string }): d is CallDeploymentVertex {
  return d.type === "Call";
}

function isHardhatArtifact(d: {
  type: string;
}): d is ArtifactContractDeploymentVertex {
  return d.type === "ArtifactContract";
}

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

  it("should deploy with a given value - contract", () => {
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

  it("should deploy with a given value - call", () => {
    const depNode = getDeploymentVertexByLabel(
      deploymentGraph,
      "Exchange/addToken"
    );

    assert.isDefined(depNode);
    if (!isHardhatCall(depNode)) {
      return assert.fail("unknown error");
    }

    assert.equal(
      depNode.value.toString(),
      ethers.utils.parseUnits("10").toString()
    );
  });

  it("should deploy with a given value - artifact", () => {
    const depNode = getDeploymentVertexByLabel(deploymentGraph, "Foo");

    assert.isDefined(depNode);
    if (!isHardhatArtifact(depNode)) {
      return assert.fail("unknown error");
    }

    assert.equal(
      depNode.value.toString(),
      ethers.utils.parseUnits("3").toString()
    );
  });

  it("should throw if given a value that is not a BigNumber - contract", () => {
    const callModule = buildModule("call", (m: IDeploymentBuilder) => {
      // @ts-ignore
      const token = m.contract("Token", { value: "42" });

      return { token };
    });

    assert.throws(
      () => generateDeploymentGraphFrom(callModule, { chainId: 31337 }),
      /`value` must be a BigNumber/
    );
  });

  it("should throw if given a value that is not a BigNumber - call", () => {
    const callModule = buildModule("call", (m: IDeploymentBuilder) => {
      const token = m.contract("Token");
      const exchange = m.contract("Exchange");

      m.call(exchange, "addToken", {
        args: [token],
        // @ts-ignore
        value: 10,
      });

      return {};
    });

    assert.throws(
      () => generateDeploymentGraphFrom(callModule, { chainId: 31337 }),
      /`value` must be a BigNumber/
    );
  });

  it("should throw if given a value that is not a BigNumber - call", () => {
    const artifact = { abi: [], bytecode: "xxx" } as any as Artifact;

    const fromArtifactModule = buildModule(
      "FromArtifact",
      (m: IDeploymentBuilder) => {
        const foo = m.contract("Foo", artifact, {
          args: [0],
          value: null,
        });

        return { foo };
      }
    );

    assert.throws(
      () => generateDeploymentGraphFrom(fromArtifactModule, { chainId: 31337 }),
      /`value` must be a BigNumber/
    );
  });
});
