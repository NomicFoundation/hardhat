/* eslint-disable import/no-unused-modules */
import type { IDeploymentGraph } from "../../src/internal/types/deploymentGraph";

import { assert } from "chai";

import { buildModule } from "../../src/dsl/buildModule";
import { generateDeploymentGraphFrom } from "../../src/internal/process/generateDeploymentGraphFrom";
import {
  isArtifactContract,
  isDeployedContract,
  isHardhatContract,
} from "../../src/internal/utils/guards";
import { isFailure } from "../../src/internal/utils/process-results";
import { IDeploymentBuilder } from "../../src/types/dsl";
import { Artifact } from "../../src/types/hardhat";

import {
  getDependenciesForVertex,
  getDeploymentVertexByLabel,
} from "./helpers";

describe("deployment builder - deploy", function () {
  const options = {
    chainId: 31337,
    accounts: ["0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"],
    artifacts: [],
  };

  describe("single contract", () => {
    let deploymentGraph: IDeploymentGraph;

    before(() => {
      const singleModule = buildModule("single", (m: IDeploymentBuilder) => {
        const example = m.contract("Example", { from: m.accounts[0] });

        return { example };
      });

      const constructDeploymentGraphResult = generateDeploymentGraphFrom(
        singleModule,
        options
      );

      if (isFailure(constructDeploymentGraphResult)) {
        assert.fail("Failure to construct deployment graph");
      }

      deploymentGraph = constructDeploymentGraphResult.result.graph;
    });

    it("should create a graph", () => {
      assert.isDefined(deploymentGraph);
    });

    it("should have one node", () => {
      assert.equal(deploymentGraph.vertexes.size, 1);
    });

    it("should have the contract node", () => {
      const depNode = getDeploymentVertexByLabel(deploymentGraph, "Example");

      assert.isDefined(depNode);
      assert.equal(depNode?.label, "Example");
    });

    it("should show no dependencies for the contract node", () => {
      const depNode = getDeploymentVertexByLabel(deploymentGraph, "Example");

      if (depNode === undefined) {
        return assert.isDefined(depNode);
      }

      const deps = getDependenciesForVertex(deploymentGraph, depNode);

      assert.deepStrictEqual(deps, []);
    });

    it("should record the argument list for the contract node as empty", () => {
      const depNode = getDeploymentVertexByLabel(deploymentGraph, "Example");

      if (depNode === undefined) {
        return assert.isDefined(depNode);
      }

      if (!isHardhatContract(depNode)) {
        return assert.fail("Not a hardhat contract dependency node");
      }

      assert.deepStrictEqual(depNode.args, []);
    });

    it("should record the correct address to send from", () => {
      const depNode = getDeploymentVertexByLabel(deploymentGraph, "Example");

      if (depNode === undefined) {
        return assert.isDefined(depNode);
      }

      if (!isHardhatContract(depNode)) {
        return assert.fail("Not a hardhat contract dependency node");
      }

      assert.equal(depNode.from, "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266");
    });
  });

  describe("two unrelated contracts", () => {
    let deploymentGraph: IDeploymentGraph;

    before(() => {
      const twoContractsModule = buildModule(
        "two contracts",
        (m: IDeploymentBuilder) => {
          const example1 = m.contract("Example1");
          const example2 = m.contract("Example2");

          return { example1, example2 };
        }
      );

      const constructDeploymentGraphResult = generateDeploymentGraphFrom(
        twoContractsModule,
        options
      );

      if (isFailure(constructDeploymentGraphResult)) {
        assert.fail("Failure to construct deployment graph");
      }

      deploymentGraph = constructDeploymentGraphResult.result.graph;
    });

    it("should create a graph", () => {
      assert.isDefined(deploymentGraph);
    });

    it("should have two nodes", () => {
      assert.equal(deploymentGraph.vertexes.size, 2);
    });

    it("should have both contract nodes", () => {
      const depNode1 = getDeploymentVertexByLabel(deploymentGraph, "Example1");

      assert.isDefined(depNode1);
      assert.equal(depNode1?.label, "Example1");

      const depNode2 = getDeploymentVertexByLabel(deploymentGraph, "Example2");

      assert.isDefined(depNode2);
      assert.equal(depNode2?.label, "Example2");
    });

    it("should show no dependencies either contract node", () => {
      const depNode1 = getDeploymentVertexByLabel(deploymentGraph, "Example1");

      if (depNode1 === undefined) {
        return assert.isDefined(depNode1);
      }

      const deps1 = getDependenciesForVertex(deploymentGraph, depNode1);

      assert.deepStrictEqual(deps1, []);

      const depNode2 = getDeploymentVertexByLabel(deploymentGraph, "Example2");

      if (depNode2 === undefined) {
        return assert.isDefined(depNode1);
      }

      const deps2 = getDependenciesForVertex(deploymentGraph, depNode2);

      assert.deepStrictEqual(deps2, []);
    });
  });

  describe("contract with constructor args", () => {
    let deploymentGraph: IDeploymentGraph;

    before(() => {
      const withConstructorArgsModule = buildModule(
        "withConstructorArgs",
        (m: IDeploymentBuilder) => {
          const token = m.contract("Token", {
            args: ["My Token", "TKN", 18],
          });

          return { token };
        }
      );

      const constructDeploymentGraphResult = generateDeploymentGraphFrom(
        withConstructorArgsModule,
        options
      );

      if (isFailure(constructDeploymentGraphResult)) {
        assert.fail("Failure to construct deployment graph");
      }

      deploymentGraph = constructDeploymentGraphResult.result.graph;
    });

    it("should create a graph", () => {
      assert.isDefined(deploymentGraph);
    });

    it("should have one node", () => {
      assert.equal(deploymentGraph.vertexes.size, 1);
    });

    it("should have the contract node", () => {
      const depNode = getDeploymentVertexByLabel(deploymentGraph, "Token");

      assert.isDefined(depNode);
      assert.equal(depNode?.label, "Token");
    });

    it("should show no dependencies for the contract node", () => {
      const depNode = getDeploymentVertexByLabel(deploymentGraph, "Token");

      if (depNode === undefined) {
        return assert.isDefined(depNode);
      }

      const deps = getDependenciesForVertex(deploymentGraph, depNode);

      assert.deepStrictEqual(deps, []);
    });

    it("should record the argument list for the contract node", () => {
      const depNode = getDeploymentVertexByLabel(deploymentGraph, "Token");

      if (depNode === undefined) {
        return assert.isDefined(depNode);
      }

      if (!isHardhatContract(depNode)) {
        return assert.fail("Not a hardhat contract dependency node");
      }

      assert.deepStrictEqual(depNode.args, ["My Token", "TKN", 18]);
    });
  });

  describe("dependencies between contracts", () => {
    let deploymentGraph: IDeploymentGraph;

    before(() => {
      const depsBetweenContractsModule = buildModule(
        "dependenciesBetweenContracts",
        (m: IDeploymentBuilder) => {
          const a = m.contract("A");
          const someother = m.contract("Someother");

          const b = m.contract("B", {
            args: [a],
            after: [someother],
          });

          return { a, b };
        }
      );

      const constructDeploymentGraphResult = generateDeploymentGraphFrom(
        depsBetweenContractsModule,
        options
      );

      if (isFailure(constructDeploymentGraphResult)) {
        assert.fail("Failure to construct deployment graph");
      }

      deploymentGraph = constructDeploymentGraphResult.result.graph;
    });

    it("should create a graph", () => {
      assert.isDefined(deploymentGraph);
    });

    it("should have three nodes", () => {
      assert.equal(deploymentGraph.vertexes.size, 3);
    });

    it("should have the contract node A", () => {
      const depNode = getDeploymentVertexByLabel(deploymentGraph, "A");

      if (depNode === undefined) {
        return assert.isDefined(depNode);
      }
      assert.equal(depNode?.label, "A");
      assert(isHardhatContract(depNode));
    });

    it("should have the contract node B", () => {
      const depNode = getDeploymentVertexByLabel(deploymentGraph, "B");

      if (depNode === undefined) {
        return assert.isDefined(depNode);
      }

      assert.equal(depNode?.label, "B");
      assert(isHardhatContract(depNode));
    });

    it("should show no dependencies for the contract node A", () => {
      const depNode = getDeploymentVertexByLabel(deploymentGraph, "A");

      if (depNode === undefined) {
        return assert.isDefined(depNode);
      }

      const deps = getDependenciesForVertex(deploymentGraph, depNode);

      assert.deepStrictEqual(deps, []);
    });

    it("should show two dependencies, on A for the contract node B, on A for Someother", () => {
      const depNode = getDeploymentVertexByLabel(deploymentGraph, "B");

      if (depNode === undefined) {
        return assert.isDefined(depNode);
      }

      const deps = getDependenciesForVertex(deploymentGraph, depNode);

      assert.deepStrictEqual(deps, [
        { id: 0, label: "A", type: "" },
        { id: 1, label: "Someother", type: "" },
      ]);
    });

    it("should record the argument list for the contract node A as empty", () => {
      const depNode = getDeploymentVertexByLabel(deploymentGraph, "A");

      if (depNode === undefined) {
        return assert.isDefined(depNode);
      }

      if (!isHardhatContract(depNode)) {
        return assert.fail("Not a hardhat contract dependency node");
      }

      assert.deepStrictEqual(depNode.args, []);
    });
  });

  describe("existing contract", () => {
    let deploymentGraph: IDeploymentGraph;

    before(() => {
      const uniswapModule = buildModule("Uniswap", (m: IDeploymentBuilder) => {
        const abi = [{}];
        const someother = m.contract("Someother");

        const uniswap = m.contractAt("UniswapRouter", "0x123...", abi, {
          after: [someother],
        });

        return { uniswap };
      });

      const constructDeploymentGraphResult = generateDeploymentGraphFrom(
        uniswapModule,
        options
      );

      if (isFailure(constructDeploymentGraphResult)) {
        assert.fail("Failure to construct deployment graph");
      }

      deploymentGraph = constructDeploymentGraphResult.result.graph;
    });

    it("should create a graph", () => {
      assert.isDefined(deploymentGraph);
    });

    it("should have two nodes", () => {
      assert.equal(deploymentGraph.vertexes.size, 2);
    });

    it("should have the deployed contract node", () => {
      const depNode = getDeploymentVertexByLabel(
        deploymentGraph,
        "UniswapRouter"
      );

      if (depNode === undefined) {
        return assert.isDefined(depNode);
      }

      assert.equal(depNode?.label, "UniswapRouter");
      assert(isDeployedContract(depNode));
    });

    it("should show one dependencies for the deployed contract node on someother", () => {
      const depNode = getDeploymentVertexByLabel(
        deploymentGraph,
        "UniswapRouter"
      );

      if (depNode === undefined) {
        return assert.isDefined(depNode);
      }

      const deps = getDependenciesForVertex(deploymentGraph, depNode);

      assert.deepStrictEqual(deps, [{ id: 0, label: "Someother", type: "" }]);
    });
  });

  describe("deploying a contract from an artifact", () => {
    let deploymentGraph: IDeploymentGraph;

    before(() => {
      const artifact = { abi: [], bytecode: "xxx" } as any as Artifact;

      const fromArtifactModule = buildModule(
        "FromArtifact",
        (m: IDeploymentBuilder) => {
          const someother = m.contract("Someother");

          const foo = m.contract("Foo", artifact, {
            args: [0],
            after: [someother],
          });

          return { foo };
        }
      );

      const constructDeploymentGraphResult = generateDeploymentGraphFrom(
        fromArtifactModule,
        options
      );

      if (isFailure(constructDeploymentGraphResult)) {
        assert.fail("Failure to construct deployment graph");
      }

      deploymentGraph = constructDeploymentGraphResult.result.graph;
    });

    it("should create a graph", () => {
      assert.isDefined(deploymentGraph);
    });

    it("should have two nodes", () => {
      assert.equal(deploymentGraph.vertexes.size, 2);
    });

    it("should have the artifact contract node", () => {
      const depNode = getDeploymentVertexByLabel(deploymentGraph, "Foo");

      if (depNode === undefined) {
        return assert.isDefined(depNode);
      }

      assert.equal(depNode?.label, "Foo");
      assert(isArtifactContract(depNode));
    });

    it("should show one dependency for the artifact contract node on Someother", () => {
      const depNode = getDeploymentVertexByLabel(deploymentGraph, "Foo");

      if (depNode === undefined) {
        return assert.isDefined(depNode);
      }

      const deps = getDependenciesForVertex(deploymentGraph, depNode);

      assert.deepStrictEqual(deps, [
        {
          id: 0,
          label: "Someother",
          type: "",
        },
      ]);
    });

    it("should record the argument list for the artifact contract node", () => {
      const depNode = getDeploymentVertexByLabel(deploymentGraph, "Foo");

      if (depNode === undefined) {
        return assert.isDefined(depNode);
      }

      if (!isArtifactContract(depNode)) {
        return assert.fail("Not an artifact contract dependency node");
      }

      assert.deepStrictEqual(depNode.args, [0]);
    });
  });
});
