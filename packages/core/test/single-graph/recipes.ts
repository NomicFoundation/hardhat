/* eslint-disable import/no-unused-modules */
import { assert } from "chai";

import { RecipeGraph } from "../../src/single-graph//recipe/RecipeGraph";
import { VertexDescriptor } from "../../src/single-graph//types/graph";
import { getDependenciesFor } from "../../src/single-graph/graph/adjacencyList";
import { generateRecipeGraphFrom } from "../../src/single-graph/process/generateRecipeGraphFrom";
import { buildRecipe } from "../../src/single-graph/recipe/buildRecipe";
import { Artifact } from "../../src/single-graph/types/hardhat";
import type {
  IRecipeGraph,
  IRecipeGraphBuilder,
  RecipeVertex,
} from "../../src/single-graph/types/recipeGraph";
import {
  isArtifactContract,
  isCall,
  isDeployedContract,
  isHardhatContract,
  isHardhatLibrary,
} from "../../src/single-graph/utils/guards";

describe("Recipes", function () {
  describe("single contract", () => {
    let recipeGraph: IRecipeGraph;

    before(() => {
      const singleRecipe = buildRecipe("single", (m: IRecipeGraphBuilder) => {
        const example = m.contract("Example");

        return { example };
      });

      const { graph } = generateRecipeGraphFrom(singleRecipe, {
        chainId: 31337,
      });

      recipeGraph = graph;
    });

    it("should create a graph", () => {
      assert.isDefined(recipeGraph);
    });

    it("should have one node", () => {
      assert.equal(recipeGraph.vertexes.size, 1);
    });

    it("should have the contract node", () => {
      const depNode = getRecipeVertexByLabel(recipeGraph, "Example");

      assert.isDefined(depNode);
      assert.equal(depNode?.label, "Example");
    });

    it("should show no dependencies for the contract node", () => {
      const depNode = getRecipeVertexByLabel(recipeGraph, "Example");

      if (depNode === undefined) {
        return assert.isDefined(depNode);
      }

      const deps = getDependenciesForVertex(recipeGraph, depNode);

      assert.deepStrictEqual(deps, []);
    });

    it("should record the argument list for the contract node as empty", () => {
      const depNode = getRecipeVertexByLabel(recipeGraph, "Example");

      if (depNode === undefined) {
        return assert.isDefined(depNode);
      }

      if (!isHardhatContract(depNode)) {
        return assert.fail("Not a hardhat contract dependency node");
      }

      assert.deepStrictEqual(depNode.args, []);
    });
  });

  describe("two unrelated contracts", () => {
    let recipeGraph: IRecipeGraph;

    before(() => {
      const twoContractsRecipe = buildRecipe(
        "two contracts",
        (m: IRecipeGraphBuilder) => {
          const example1 = m.contract("Example1");
          const example2 = m.contract("Example2");

          return { example1, example2 };
        }
      );

      const { graph } = generateRecipeGraphFrom(twoContractsRecipe, {
        chainId: 31337,
      });

      recipeGraph = graph;
    });

    it("should create a graph", () => {
      assert.isDefined(recipeGraph);
    });

    it("should have two nodes", () => {
      assert.equal(recipeGraph.vertexes.size, 2);
    });

    it("should have both contract nodes", () => {
      const depNode1 = getRecipeVertexByLabel(recipeGraph, "Example1");

      assert.isDefined(depNode1);
      assert.equal(depNode1?.label, "Example1");

      const depNode2 = getRecipeVertexByLabel(recipeGraph, "Example2");

      assert.isDefined(depNode2);
      assert.equal(depNode2?.label, "Example2");
    });

    it("should show no dependencies either contract node", () => {
      const depNode1 = getRecipeVertexByLabel(recipeGraph, "Example1");

      if (depNode1 === undefined) {
        return assert.isDefined(depNode1);
      }

      const deps1 = getDependenciesForVertex(recipeGraph, depNode1);

      assert.deepStrictEqual(deps1, []);

      const depNode2 = getRecipeVertexByLabel(recipeGraph, "Example2");

      if (depNode2 === undefined) {
        return assert.isDefined(depNode1);
      }

      const deps2 = getDependenciesForVertex(recipeGraph, depNode2);

      assert.deepStrictEqual(deps2, []);
    });
  });

  describe("contract with constructor args", () => {
    let recipeGraph: IRecipeGraph;

    before(() => {
      const withConstructorArgsRecipe = buildRecipe(
        "withConstructorArgs",
        (m: IRecipeGraphBuilder) => {
          const token = m.contract("Token", {
            args: ["My Token", "TKN", 18],
          });

          return { token };
        }
      );

      const { graph } = generateRecipeGraphFrom(withConstructorArgsRecipe, {
        chainId: 31337,
      });

      recipeGraph = graph;
    });

    it("should create a graph", () => {
      assert.isDefined(recipeGraph);
    });

    it("should have one node", () => {
      assert.equal(recipeGraph.vertexes.size, 1);
    });

    it("should have the contract node", () => {
      const depNode = getRecipeVertexByLabel(recipeGraph, "Token");

      assert.isDefined(depNode);
      assert.equal(depNode?.label, "Token");
    });

    it("should show no dependencies for the contract node", () => {
      const depNode = getRecipeVertexByLabel(recipeGraph, "Token");

      if (depNode === undefined) {
        return assert.isDefined(depNode);
      }

      const deps = getDependenciesForVertex(recipeGraph, depNode);

      assert.deepStrictEqual(deps, []);
    });

    it("should record the argument list for the contract node", () => {
      const depNode = getRecipeVertexByLabel(recipeGraph, "Token");

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
    let recipeGraph: IRecipeGraph;

    before(() => {
      const depsBetweenContractsRecipe = buildRecipe(
        "dependenciesBetweenContracts",
        (m: IRecipeGraphBuilder) => {
          const a = m.contract("A");

          const b = m.contract("B", {
            args: [a],
          });

          return { a, b };
        }
      );

      const { graph } = generateRecipeGraphFrom(depsBetweenContractsRecipe, {
        chainId: 31337,
      });

      recipeGraph = graph;
    });

    it("should create a graph", () => {
      assert.isDefined(recipeGraph);
    });

    it("should have two nodes", () => {
      assert.equal(recipeGraph.vertexes.size, 2);
    });

    it("should have the contract node A", () => {
      const depNode = getRecipeVertexByLabel(recipeGraph, "A");

      if (depNode === undefined) {
        return assert.isDefined(depNode);
      }
      assert.equal(depNode?.label, "A");
      assert(isHardhatContract(depNode));
    });

    it("should have the contract node B", () => {
      const depNode = getRecipeVertexByLabel(recipeGraph, "B");

      if (depNode === undefined) {
        return assert.isDefined(depNode);
      }

      assert.equal(depNode?.label, "B");
      assert(isHardhatContract(depNode));
    });

    it("should show no dependencies for the contract node A", () => {
      const depNode = getRecipeVertexByLabel(recipeGraph, "A");

      if (depNode === undefined) {
        return assert.isDefined(depNode);
      }

      const deps = getDependenciesForVertex(recipeGraph, depNode);

      assert.deepStrictEqual(deps, []);
    });

    it("should show one dependency on A for the contract node B", () => {
      const depNode = getRecipeVertexByLabel(recipeGraph, "B");

      if (depNode === undefined) {
        return assert.isDefined(depNode);
      }

      const deps = getDependenciesForVertex(recipeGraph, depNode);

      assert.deepStrictEqual(deps, [{ id: 0, label: "A" }]);
    });

    it("should record the argument list for the contract node A as empty", () => {
      const depNode = getRecipeVertexByLabel(recipeGraph, "A");

      if (depNode === undefined) {
        return assert.isDefined(depNode);
      }

      if (!isHardhatContract(depNode)) {
        return assert.fail("Not a hardhat contract dependency node");
      }

      assert.deepStrictEqual(depNode.args, []);
    });
  });

  describe("make a call on a contract", () => {
    let recipeGraph: IRecipeGraph;

    before(() => {
      const callRecipe = buildRecipe("call", (m: IRecipeGraphBuilder) => {
        const token = m.contract("Token");
        const exchange = m.contract("Exchange");

        m.call(exchange, "addToken", {
          args: [token],
        });

        return {};
      });

      const { graph } = generateRecipeGraphFrom(callRecipe, {
        chainId: 31337,
      });

      recipeGraph = graph;
    });

    it("should create a graph", () => {
      assert.isDefined(recipeGraph);
    });

    it("should have three nodes", () => {
      assert.equal(recipeGraph.vertexes.size, 3);
    });

    it("should have the contract node Token", () => {
      const depNode = getRecipeVertexByLabel(recipeGraph, "Token");

      if (depNode === undefined) {
        return assert.isDefined(depNode);
      }
      assert.equal(depNode?.label, "Token");
      assert(isHardhatContract(depNode));
    });

    it("should have the contract node Exchange", () => {
      const depNode = getRecipeVertexByLabel(recipeGraph, "Exchange");

      if (depNode === undefined) {
        return assert.isDefined(depNode);
      }

      assert.equal(depNode?.label, "Exchange");
      assert(isHardhatContract(depNode));
    });

    it("should have the call node Exchange/addToken", () => {
      const depNode = getRecipeVertexByLabel(recipeGraph, "Exchange/addToken");

      if (depNode === undefined) {
        return assert.isDefined(depNode);
      }

      assert.equal(depNode?.label, "Exchange/addToken");
      assert(isCall(depNode));
    });

    it("should show no dependencies for the contract node Token", () => {
      const depNode = getRecipeVertexByLabel(recipeGraph, "Token");

      if (depNode === undefined) {
        return assert.isDefined(depNode);
      }

      const deps = getDependenciesForVertex(recipeGraph, depNode);

      assert.deepStrictEqual(deps, []);
    });

    it("should show no dependencies for the contract node Exchange", () => {
      const depNode = getRecipeVertexByLabel(recipeGraph, "Exchange");

      if (depNode === undefined) {
        return assert.isDefined(depNode);
      }

      const deps = getDependenciesForVertex(recipeGraph, depNode);

      assert.deepStrictEqual(deps, []);
    });

    it("should show two dependencies for the call node Exchange/addToken", () => {
      const depNode = getRecipeVertexByLabel(recipeGraph, "Exchange/addToken");

      if (depNode === undefined) {
        return assert.isDefined(depNode);
      }

      const deps = getDependenciesForVertex(recipeGraph, depNode);

      assert.deepStrictEqual(deps, [
        {
          id: 0,
          label: "Token",
        },
        { id: 1, label: "Exchange" },
      ]);
    });

    it("should record the argument list for the contract node Token as empty", () => {
      const depNode = getRecipeVertexByLabel(recipeGraph, "Token");

      if (depNode === undefined) {
        return assert.isDefined(depNode);
      }

      if (!isHardhatContract(depNode)) {
        return assert.fail("Not a hardhat contract dependency node");
      }

      assert.deepStrictEqual(depNode.args, []);
    });

    it("should record the argument list for the contract node Exchange as empty", () => {
      const depNode = getRecipeVertexByLabel(recipeGraph, "Exchange");

      if (depNode === undefined) {
        return assert.isDefined(depNode);
      }

      if (!isHardhatContract(depNode)) {
        return assert.fail("Not a hardhat contract dependency node");
      }

      assert.deepStrictEqual(depNode.args, []);
    });

    it("should record the argument list for the call node Exchange at Exchange/addToken", () => {
      const depNode = getRecipeVertexByLabel(recipeGraph, "Exchange/addToken");

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
  });

  describe("existing contract", () => {
    let recipeGraph: IRecipeGraph;

    before(() => {
      const uniswapRecipe = buildRecipe("Uniswap", (m: IRecipeGraphBuilder) => {
        const abi = [{}];
        const uniswap = m.contractAt("UniswapRouter", "0x123...", abi);

        return { uniswap };
      });

      const { graph } = generateRecipeGraphFrom(uniswapRecipe, {
        chainId: 31337,
      });

      recipeGraph = graph;
    });

    it("should create a graph", () => {
      assert.isDefined(recipeGraph);
    });

    it("should have one node", () => {
      assert.equal(recipeGraph.vertexes.size, 1);
    });

    it("should have the deployed contract node", () => {
      const depNode = getRecipeVertexByLabel(recipeGraph, "UniswapRouter");

      if (depNode === undefined) {
        return assert.isDefined(depNode);
      }

      assert.equal(depNode?.label, "UniswapRouter");
      assert(isDeployedContract(depNode));
    });

    it("should show no dependencies for the deployed contract node", () => {
      const depNode = getRecipeVertexByLabel(recipeGraph, "UniswapRouter");

      if (depNode === undefined) {
        return assert.isDefined(depNode);
      }

      const deps = getDependenciesForVertex(recipeGraph, depNode);

      assert.deepStrictEqual(deps, []);
    });
  });

  describe("deploying a contract from an artifact", () => {
    let recipeGraph: IRecipeGraph;

    before(() => {
      const artifact = { abi: [], bytecode: "xxx" } as any as Artifact;

      const fromArtifactRecipe = buildRecipe(
        "FromArtifact",
        (m: IRecipeGraphBuilder) => {
          const foo = m.contract("Foo", artifact, {
            args: [0],
          });

          return { foo };
        }
      );

      const { graph } = generateRecipeGraphFrom(fromArtifactRecipe, {
        chainId: 31337,
      });

      recipeGraph = graph;
    });

    it("should create a graph", () => {
      assert.isDefined(recipeGraph);
    });

    it("should have one node", () => {
      assert.equal(recipeGraph.vertexes.size, 1);
    });

    it("should have the artifact contract node", () => {
      const depNode = getRecipeVertexByLabel(recipeGraph, "Foo");

      if (depNode === undefined) {
        return assert.isDefined(depNode);
      }

      assert.equal(depNode?.label, "Foo");
      assert(isArtifactContract(depNode));
    });

    it("should show no dependencies for the artifact contract node", () => {
      const depNode = getRecipeVertexByLabel(recipeGraph, "Foo");

      if (depNode === undefined) {
        return assert.isDefined(depNode);
      }

      const deps = getDependenciesForVertex(recipeGraph, depNode);

      assert.deepStrictEqual(deps, []);
    });

    it("should record the argument list for the artifact contract node", () => {
      const depNode = getRecipeVertexByLabel(recipeGraph, "Foo");

      if (depNode === undefined) {
        return assert.isDefined(depNode);
      }

      if (!isArtifactContract(depNode)) {
        return assert.fail("Not an artifact contract dependency node");
      }

      assert.deepStrictEqual(depNode.args, [0]);
    });
  });

  describe("libraries", () => {
    let recipeGraph: IRecipeGraph;

    before(() => {
      const librariesRecipe = buildRecipe(
        "libraries",
        (m: IRecipeGraphBuilder) => {
          const safeMath = m.library("SafeMath", {
            args: [42],
          });

          const contract = m.contract("Contract", {
            libraries: {
              SafeMath: safeMath,
            },
          });

          return { safeMath, contract };
        }
      );

      const { graph } = generateRecipeGraphFrom(librariesRecipe, {
        chainId: 31,
      });

      recipeGraph = graph;
    });

    it("should create a graph", () => {
      assert.isDefined(recipeGraph);
    });

    it("should have two nodes", () => {
      assert.equal(recipeGraph.vertexes.size, 2);
    });

    it("should have the library node SafeMath", () => {
      const depNode = getRecipeVertexByLabel(recipeGraph, "SafeMath");

      if (depNode === undefined) {
        return assert.isDefined(depNode);
      }

      assert.equal(depNode?.label, "SafeMath");
      assert(isHardhatLibrary(depNode));
    });

    it("should have the contract node Contract", () => {
      const depNode = getRecipeVertexByLabel(recipeGraph, "Contract");

      if (depNode === undefined) {
        return assert.isDefined(depNode);
      }

      assert.equal(depNode?.label, "Contract");
      assert(isHardhatContract(depNode));
    });

    it("should show no dependencies for the library node SafeMath", () => {
      const depNode = getRecipeVertexByLabel(recipeGraph, "SafeMath");

      if (depNode === undefined) {
        return assert.isDefined(depNode);
      }

      const deps = getDependenciesForVertex(recipeGraph, depNode);

      assert.deepStrictEqual(deps, []);
    });

    it("should show one dependency on library node SafeMath for Contract", () => {
      const depNode = getRecipeVertexByLabel(recipeGraph, "Contract");

      if (depNode === undefined) {
        return assert.isDefined(depNode);
      }

      const deps = getDependenciesForVertex(recipeGraph, depNode);

      assert.deepStrictEqual(deps, [{ id: 0, label: "SafeMath" }]);
    });

    it("should record the argument list for the library node SafeMath as [42]", () => {
      const depNode = getRecipeVertexByLabel(recipeGraph, "SafeMath");

      if (depNode === undefined) {
        return assert.isDefined(depNode);
      }

      if (!isHardhatLibrary(depNode)) {
        return assert.fail("Not a hardhat library dependency node");
      }

      assert.deepStrictEqual(depNode.args, [42]);
    });
  });

  describe("network chain id", () => {
    it("should inject the chainId via the builder", () => {
      const chainIdRecipe = buildRecipe("chainId", (m: IRecipeGraphBuilder) => {
        if (m.chainId === 42) {
          return {};
        }

        assert.fail("Chain id was not injected");

        return {};
      });

      generateRecipeGraphFrom(chainIdRecipe, { chainId: 42 });
    });
  });

  describe("recipe parameters", () => {
    let recipeGraph: IRecipeGraph;

    before(() => {
      const librariesRecipe = buildRecipe(
        "libraries",
        (m: IRecipeGraphBuilder) => {
          const symbol = m.getOptionalParam("tokenSymbol", "TKN");
          const name = m.getParam("tokenName");
          const token = m.contract("Token", {
            args: [symbol, name, 1_000_000],
          });

          return { token };
        }
      );

      const { graph } = generateRecipeGraphFrom(librariesRecipe, {
        chainId: 31,
      });

      recipeGraph = graph;
    });

    it("should create a graph", () => {
      assert.isDefined(recipeGraph);
    });

    it("should have one node", () => {
      assert.equal(recipeGraph.vertexes.size, 1);
    });
  });
});

function getRecipeVertexByLabel(
  recipeGraph: RecipeGraph,
  label: string
): RecipeVertex | undefined {
  return Array.from(recipeGraph.vertexes.values()).find(
    (n) => n.label === label
  );
}

function getDependenciesForVertex(
  recipeGraph: RecipeGraph,
  { id }: { id: number }
): VertexDescriptor[] {
  const depIds = getDependenciesFor(recipeGraph.adjacencyList, id);

  return depIds
    .map((depId) => recipeGraph.vertexes.get(depId))
    .filter((nodeDesc): nodeDesc is RecipeVertex => nodeDesc !== undefined)
    .map((vertex) => ({ id: vertex.id, label: vertex.label }));
}
