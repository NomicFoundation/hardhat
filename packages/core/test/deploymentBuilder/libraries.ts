/* eslint-disable import/no-unused-modules */
import type {
  IDeploymentGraph,
  IDeploymentBuilder,
} from "../../src/types/deploymentGraph";

import { assert } from "chai";

import { buildModule } from "../../src/dsl/buildModule";
import { generateDeploymentGraphFrom } from "../../src/process/generateDeploymentGraphFrom";
import { isHardhatContract, isHardhatLibrary } from "../../src/utils/guards";

import {
  getDependenciesForVertex,
  getDeploymentVertexByLabel,
} from "./helpers";

describe("deployment builder - libraries", () => {
  describe("libraries", () => {
    let deploymentGraph: IDeploymentGraph;

    before(() => {
      const librariesModule = buildModule(
        "libraries",
        (m: IDeploymentBuilder) => {
          const someother = m.contract("Someother");

          const safeMath = m.library("SafeMath", {
            args: [42],
            after: [someother],
            from: m.accounts[0],
          });

          const contract = m.contract("Contract", {
            libraries: {
              SafeMath: safeMath,
            },
          });

          return { safeMath, contract };
        }
      );

      const { graph } = generateDeploymentGraphFrom(librariesModule, {
        chainId: 31,
        accounts: ["0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"],
      });

      deploymentGraph = graph;
    });

    it("should create a graph", () => {
      assert.isDefined(deploymentGraph);
    });

    it("should have three nodes", () => {
      assert.equal(deploymentGraph.vertexes.size, 3);
    });

    it("should have the library node SafeMath", () => {
      const depNode = getDeploymentVertexByLabel(deploymentGraph, "SafeMath");

      if (depNode === undefined) {
        return assert.isDefined(depNode);
      }

      assert.equal(depNode?.label, "SafeMath");
      assert(isHardhatLibrary(depNode));
    });

    it("should have the contract node Contract", () => {
      const depNode = getDeploymentVertexByLabel(deploymentGraph, "Contract");

      if (depNode === undefined) {
        return assert.isDefined(depNode);
      }

      assert.equal(depNode?.label, "Contract");
      assert(isHardhatContract(depNode));
    });

    it("should show one dependencies for the library node SafeMath to Someother", () => {
      const depNode = getDeploymentVertexByLabel(deploymentGraph, "SafeMath");

      if (depNode === undefined) {
        return assert.isDefined(depNode);
      }

      const deps = getDependenciesForVertex(deploymentGraph, depNode);

      assert.deepStrictEqual(deps, [{ id: 0, label: "Someother", type: "" }]);
    });

    it("should show one dependency on library node SafeMath for Contract", () => {
      const depNode = getDeploymentVertexByLabel(deploymentGraph, "Contract");

      if (depNode === undefined) {
        return assert.isDefined(depNode);
      }

      const deps = getDependenciesForVertex(deploymentGraph, depNode);

      assert.deepStrictEqual(deps, [{ id: 1, label: "SafeMath", type: "" }]);
    });

    it("should record the argument list for the library node SafeMath as [42]", () => {
      const depNode = getDeploymentVertexByLabel(deploymentGraph, "SafeMath");

      if (depNode === undefined) {
        return assert.isDefined(depNode);
      }

      if (!isHardhatLibrary(depNode)) {
        return assert.fail("Not a hardhat library dependency node");
      }

      assert.deepStrictEqual(depNode.args, [42]);
    });

    it("should record the correct address to deploy from", () => {
      const depNode = getDeploymentVertexByLabel(deploymentGraph, "SafeMath");

      if (depNode === undefined) {
        return assert.isDefined(depNode);
      }

      if (!isHardhatLibrary(depNode)) {
        return assert.fail("Not a hardhat library dependency node");
      }

      assert.equal(depNode.from, "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266");
    });
  });
});
