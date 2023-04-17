/* eslint-disable import/no-unused-modules */
import { assert } from "chai";

import { buildModule } from "../../src/buildModule";
import { generateDeploymentGraphFrom } from "../../src/internal/process/generateDeploymentGraphFrom";
import { IDeploymentGraph } from "../../src/internal/types/deploymentGraph";
import {
  isStaticCall,
  isHardhatContract,
} from "../../src/internal/utils/guards";
import { isFailure } from "../../src/internal/utils/process-results";
import { IDeploymentBuilder } from "../../src/types/dsl";

import {
  getDependenciesForVertex,
  getDeploymentVertexByLabel,
} from "./helpers";

describe("deployment builder - static calls", () => {
  describe("with basic value args", () => {
    let deploymentGraph: IDeploymentGraph;

    before(() => {
      const callModule = buildModule("call", (m: IDeploymentBuilder) => {
        const token = m.contract("Token");

        const totalSupply = m.staticCall(token, "totalSupply", {
          args: [token],
          from: m.accounts[0],
        });

        const exchange = m.contract("Exchange", { args: [totalSupply] });

        return { token, exchange };
      });

      const constructDeploymentGraphResult = generateDeploymentGraphFrom(
        callModule,
        {
          chainId: 31337,
          accounts: ["0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"],
          artifacts: [],
        }
      );

      if (isFailure(constructDeploymentGraphResult)) {
        assert.fail("Construction of deployment graph failed");
      }

      deploymentGraph = constructDeploymentGraphResult.result.graph;
    });

    it("should create a graph", () => {
      assert.isDefined(deploymentGraph);
    });

    it("should have three nodes", () => {
      assert.equal(deploymentGraph.vertexes.size, 3);
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

    it("should have the static call node Token/totalSupply", () => {
      const depNode = getDeploymentVertexByLabel(
        deploymentGraph,
        "Token/totalSupply"
      );

      if (depNode === undefined) {
        return assert.isDefined(depNode);
      }

      assert.equal(depNode?.label, "Token/totalSupply");
      assert(isStaticCall(depNode));
    });

    it("should show no dependencies for the contract node Token", () => {
      const depNode = getDeploymentVertexByLabel(deploymentGraph, "Token");

      if (depNode === undefined) {
        return assert.isDefined(depNode);
      }

      const deps = getDependenciesForVertex(deploymentGraph, depNode);

      assert.deepStrictEqual(deps, []);
    });

    it("should show one dependency for the contract node Exchange", () => {
      const depNode = getDeploymentVertexByLabel(deploymentGraph, "Exchange");

      if (depNode === undefined) {
        return assert.isDefined(depNode);
      }

      const deps = getDependenciesForVertex(deploymentGraph, depNode);

      assert.deepStrictEqual(deps, [
        { id: 1, label: "Token/totalSupply", type: "" },
      ]);
    });

    it("should show one dependency for the static call node Token/totalSupply", () => {
      const depNode = getDeploymentVertexByLabel(
        deploymentGraph,
        "Token/totalSupply"
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

    it("should record the argument list for the contract node Exchange", () => {
      const depNode = getDeploymentVertexByLabel(deploymentGraph, "Exchange");

      if (depNode === undefined) {
        return assert.isDefined(depNode);
      }

      if (!isHardhatContract(depNode)) {
        return assert.fail("Not a hardhat contract dependency node");
      }

      assert.deepStrictEqual(depNode.args, [
        {
          vertexId: 1,
          label: "Token/totalSupply",
          type: "static-call",
          _future: true,
        },
      ]);
    });

    it("should record the argument list for the call node Token at Token/totalSupply", () => {
      const depNode = getDeploymentVertexByLabel(
        deploymentGraph,
        "Token/totalSupply"
      );

      if (depNode === undefined) {
        return assert.isDefined(depNode);
      }

      if (!isStaticCall(depNode)) {
        return assert.fail("Not a static call dependency node");
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

    it("should record the address to send from for the static call node Token at Token/totalSupply", () => {
      const depNode = getDeploymentVertexByLabel(
        deploymentGraph,
        "Token/totalSupply"
      );

      if (depNode === undefined) {
        return assert.isDefined(depNode);
      }

      if (!isStaticCall(depNode)) {
        return assert.fail("Not a static call dependency node");
      }

      assert.equal(depNode.from, "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266");
    });
  });

  describe("with array args", () => {
    let deploymentGraph: IDeploymentGraph;

    before(() => {
      const callModule = buildModule("call", (m: IDeploymentBuilder) => {
        const captureArraysContracts = m.contract("CaptureArraysContract");

        m.staticCall(captureArraysContracts, "recordArrays", {
          args: [
            [1, 2, 3],
            ["a", "b", "c"],
            [true, false, true],
          ],
          from: m.accounts[0],
        });

        return {};
      });

      const constructDeploymentGraphResult = generateDeploymentGraphFrom(
        callModule,
        {
          chainId: 31337,
          accounts: ["0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"],
          artifacts: [],
        }
      );

      if (isFailure(constructDeploymentGraphResult)) {
        assert.fail("Construction of deployment graph failed");
      }

      deploymentGraph = constructDeploymentGraphResult.result.graph;
    });

    it("should create a graph", () => {
      assert.isDefined(deploymentGraph);
    });

    it("should have two nodes", () => {
      assert.equal(deploymentGraph.vertexes.size, 2);
    });

    it("should have the contract node CaptureArraysContract", () => {
      const depNode = getDeploymentVertexByLabel(
        deploymentGraph,
        "CaptureArraysContract"
      );

      if (depNode === undefined) {
        return assert.isDefined(depNode);
      }

      assert.equal(depNode?.label, "CaptureArraysContract");
      assert(isHardhatContract(depNode));
    });

    it("should have the static call node CaptureArraysContract/recordArrays", () => {
      const depNode = getDeploymentVertexByLabel(
        deploymentGraph,
        "CaptureArraysContract/recordArrays"
      );

      if (depNode === undefined) {
        return assert.isDefined(depNode);
      }

      assert.equal(depNode?.label, "CaptureArraysContract/recordArrays");
      assert(isStaticCall(depNode));
    });

    it("should show no dependencies for the contract node Token", () => {
      const depNode = getDeploymentVertexByLabel(
        deploymentGraph,
        "CaptureArraysContract"
      );

      if (depNode === undefined) {
        return assert.isDefined(depNode);
      }

      const deps = getDependenciesForVertex(deploymentGraph, depNode);

      assert.deepStrictEqual(deps, []);
    });

    it("should show one dependencies for the call node CaptureArraysContract/recordArrays", () => {
      const depNode = getDeploymentVertexByLabel(
        deploymentGraph,
        "CaptureArraysContract/recordArrays"
      );

      if (depNode === undefined) {
        return assert.isDefined(depNode);
      }

      const deps = getDependenciesForVertex(deploymentGraph, depNode);

      assert.deepStrictEqual(deps, [
        {
          id: 0,
          label: "CaptureArraysContract",
          type: "",
        },
      ]);
    });

    it("should record the argument list for the contract node CaptureArraysContract as empty", () => {
      const depNode = getDeploymentVertexByLabel(
        deploymentGraph,
        "CaptureArraysContract"
      );

      if (depNode === undefined) {
        return assert.isDefined(depNode);
      }

      if (!isHardhatContract(depNode)) {
        return assert.fail("Not a hardhat contract dependency node");
      }

      assert.deepStrictEqual(depNode.args, []);
    });

    it("should record the argument list for the call node CaptureArraysContract at CaptureArraysContract/recordArrays", () => {
      const depNode = getDeploymentVertexByLabel(
        deploymentGraph,
        "CaptureArraysContract/recordArrays"
      );

      if (depNode === undefined) {
        return assert.isDefined(depNode);
      }

      if (!isStaticCall(depNode)) {
        return assert.fail("Not a static call dependency node");
      }

      assert.deepStrictEqual(depNode.args, [
        [1, 2, 3],
        ["a", "b", "c"],
        [true, false, true],
      ]);
    });

    it("should record the address to send from for the call node CaptureArraysContract at CaptureArraysContract/recordArrays", () => {
      const depNode = getDeploymentVertexByLabel(
        deploymentGraph,
        "CaptureArraysContract/recordArrays"
      );

      if (depNode === undefined) {
        return assert.isDefined(depNode);
      }

      if (!isStaticCall(depNode)) {
        return assert.fail("Not a static call dependency node");
      }

      assert.equal(depNode.from, "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266");
    });
  });
});
