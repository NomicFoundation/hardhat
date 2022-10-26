/* eslint-disable import/no-unused-modules */
import { assert } from "chai";

import { DeploymentGraph } from "dsl/DeploymentGraph";
import { buildModule } from "dsl/buildModule";
import { buildSubgraph } from "dsl/buildSubgraph";
import { getDependenciesFor } from "graph/adjacencyList";
import { generateDeploymentGraphFrom } from "process/generateDeploymentGraphFrom";
import type {
  IDeploymentGraph,
  IDeploymentBuilder,
  DeploymentGraphVertex,
} from "types/deploymentGraph";
import { VertexDescriptor } from "types/graph";
import { Artifact } from "types/hardhat";
import {
  isArtifactContract,
  isCall,
  isCallable,
  isDeployedContract,
  isHardhatContract,
  isHardhatLibrary,
} from "utils/guards";

describe("Modules", function () {
  describe("single contract", () => {
    let deploymentGraph: IDeploymentGraph;

    before(() => {
      const singleModule = buildModule("single", (m: IDeploymentBuilder) => {
        const example = m.contract("Example");

        return { example };
      });

      const { graph } = generateDeploymentGraphFrom(singleModule, {
        chainId: 31337,
      });

      deploymentGraph = graph;
    });

    it("should create a graph", () => {
      assert.isDefined(deploymentGraph);
    });

    it("should have one node", () => {
      assert.equal(deploymentGraph.vertexes.size, 1);
    });

    it("should have the contract node", () => {
      const depNode = getRecipeVertexByLabel(deploymentGraph, "Example");

      assert.isDefined(depNode);
      assert.equal(depNode?.label, "Example");
    });

    it("should show no dependencies for the contract node", () => {
      const depNode = getRecipeVertexByLabel(deploymentGraph, "Example");

      if (depNode === undefined) {
        return assert.isDefined(depNode);
      }

      const deps = getDependenciesForVertex(deploymentGraph, depNode);

      assert.deepStrictEqual(deps, []);
    });

    it("should record the argument list for the contract node as empty", () => {
      const depNode = getRecipeVertexByLabel(deploymentGraph, "Example");

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

      const { graph } = generateDeploymentGraphFrom(twoContractsModule, {
        chainId: 31337,
      });

      deploymentGraph = graph;
    });

    it("should create a graph", () => {
      assert.isDefined(deploymentGraph);
    });

    it("should have two nodes", () => {
      assert.equal(deploymentGraph.vertexes.size, 2);
    });

    it("should have both contract nodes", () => {
      const depNode1 = getRecipeVertexByLabel(deploymentGraph, "Example1");

      assert.isDefined(depNode1);
      assert.equal(depNode1?.label, "Example1");

      const depNode2 = getRecipeVertexByLabel(deploymentGraph, "Example2");

      assert.isDefined(depNode2);
      assert.equal(depNode2?.label, "Example2");
    });

    it("should show no dependencies either contract node", () => {
      const depNode1 = getRecipeVertexByLabel(deploymentGraph, "Example1");

      if (depNode1 === undefined) {
        return assert.isDefined(depNode1);
      }

      const deps1 = getDependenciesForVertex(deploymentGraph, depNode1);

      assert.deepStrictEqual(deps1, []);

      const depNode2 = getRecipeVertexByLabel(deploymentGraph, "Example2");

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
      const withConstructorArgsRecipe = buildModule(
        "withConstructorArgs",
        (m: IDeploymentBuilder) => {
          const token = m.contract("Token", {
            args: ["My Token", "TKN", 18],
          });

          return { token };
        }
      );

      const { graph } = generateDeploymentGraphFrom(withConstructorArgsRecipe, {
        chainId: 31337,
      });

      deploymentGraph = graph;
    });

    it("should create a graph", () => {
      assert.isDefined(deploymentGraph);
    });

    it("should have one node", () => {
      assert.equal(deploymentGraph.vertexes.size, 1);
    });

    it("should have the contract node", () => {
      const depNode = getRecipeVertexByLabel(deploymentGraph, "Token");

      assert.isDefined(depNode);
      assert.equal(depNode?.label, "Token");
    });

    it("should show no dependencies for the contract node", () => {
      const depNode = getRecipeVertexByLabel(deploymentGraph, "Token");

      if (depNode === undefined) {
        return assert.isDefined(depNode);
      }

      const deps = getDependenciesForVertex(deploymentGraph, depNode);

      assert.deepStrictEqual(deps, []);
    });

    it("should record the argument list for the contract node", () => {
      const depNode = getRecipeVertexByLabel(deploymentGraph, "Token");

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
      const depsBetweenContractsRecipe = buildModule(
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

      const { graph } = generateDeploymentGraphFrom(
        depsBetweenContractsRecipe,
        {
          chainId: 31337,
        }
      );

      deploymentGraph = graph;
    });

    it("should create a graph", () => {
      assert.isDefined(deploymentGraph);
    });

    it("should have three nodes", () => {
      assert.equal(deploymentGraph.vertexes.size, 3);
    });

    it("should have the contract node A", () => {
      const depNode = getRecipeVertexByLabel(deploymentGraph, "A");

      if (depNode === undefined) {
        return assert.isDefined(depNode);
      }
      assert.equal(depNode?.label, "A");
      assert(isHardhatContract(depNode));
    });

    it("should have the contract node B", () => {
      const depNode = getRecipeVertexByLabel(deploymentGraph, "B");

      if (depNode === undefined) {
        return assert.isDefined(depNode);
      }

      assert.equal(depNode?.label, "B");
      assert(isHardhatContract(depNode));
    });

    it("should show no dependencies for the contract node A", () => {
      const depNode = getRecipeVertexByLabel(deploymentGraph, "A");

      if (depNode === undefined) {
        return assert.isDefined(depNode);
      }

      const deps = getDependenciesForVertex(deploymentGraph, depNode);

      assert.deepStrictEqual(deps, []);
    });

    it("should show two dependencies, on A for the contract node B, on A for Someother", () => {
      const depNode = getRecipeVertexByLabel(deploymentGraph, "B");

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
      const depNode = getRecipeVertexByLabel(deploymentGraph, "A");

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
    let deploymentGraph: IDeploymentGraph;

    before(() => {
      const callRecipe = buildModule("call", (m: IDeploymentBuilder) => {
        const token = m.contract("Token");
        const exchange = m.contract("Exchange");
        const another = m.contract("Another");

        m.call(exchange, "addToken", {
          args: [token],
          after: [another],
        });

        return {};
      });

      const { graph } = generateDeploymentGraphFrom(callRecipe, {
        chainId: 31337,
      });

      deploymentGraph = graph;
    });

    it("should create a graph", () => {
      assert.isDefined(deploymentGraph);
    });

    it("should have four nodes", () => {
      assert.equal(deploymentGraph.vertexes.size, 4);
    });

    it("should have the contract node Token", () => {
      const depNode = getRecipeVertexByLabel(deploymentGraph, "Token");

      if (depNode === undefined) {
        return assert.isDefined(depNode);
      }
      assert.equal(depNode?.label, "Token");
      assert(isHardhatContract(depNode));
    });

    it("should have the contract node Exchange", () => {
      const depNode = getRecipeVertexByLabel(deploymentGraph, "Exchange");

      if (depNode === undefined) {
        return assert.isDefined(depNode);
      }

      assert.equal(depNode?.label, "Exchange");
      assert(isHardhatContract(depNode));
    });

    it("should have the call node Exchange/addToken", () => {
      const depNode = getRecipeVertexByLabel(
        deploymentGraph,
        "Exchange/addToken"
      );

      if (depNode === undefined) {
        return assert.isDefined(depNode);
      }

      assert.equal(depNode?.label, "Exchange/addToken");
      assert(isCall(depNode));
    });

    it("should show no dependencies for the contract node Token", () => {
      const depNode = getRecipeVertexByLabel(deploymentGraph, "Token");

      if (depNode === undefined) {
        return assert.isDefined(depNode);
      }

      const deps = getDependenciesForVertex(deploymentGraph, depNode);

      assert.deepStrictEqual(deps, []);
    });

    it("should show no dependencies for the contract node Exchange", () => {
      const depNode = getRecipeVertexByLabel(deploymentGraph, "Exchange");

      if (depNode === undefined) {
        return assert.isDefined(depNode);
      }

      const deps = getDependenciesForVertex(deploymentGraph, depNode);

      assert.deepStrictEqual(deps, []);
    });

    it("should show three dependencies for the call node Exchange/addToken", () => {
      const depNode = getRecipeVertexByLabel(
        deploymentGraph,
        "Exchange/addToken"
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
        { id: 1, label: "Exchange", type: "" },
        { id: 2, label: "Another", type: "" },
      ]);
    });

    it("should record the argument list for the contract node Token as empty", () => {
      const depNode = getRecipeVertexByLabel(deploymentGraph, "Token");

      if (depNode === undefined) {
        return assert.isDefined(depNode);
      }

      if (!isHardhatContract(depNode)) {
        return assert.fail("Not a hardhat contract dependency node");
      }

      assert.deepStrictEqual(depNode.args, []);
    });

    it("should record the argument list for the contract node Exchange as empty", () => {
      const depNode = getRecipeVertexByLabel(deploymentGraph, "Exchange");

      if (depNode === undefined) {
        return assert.isDefined(depNode);
      }

      if (!isHardhatContract(depNode)) {
        return assert.fail("Not a hardhat contract dependency node");
      }

      assert.deepStrictEqual(depNode.args, []);
    });

    it("should record the argument list for the call node Exchange at Exchange/addToken", () => {
      const depNode = getRecipeVertexByLabel(
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
    let deploymentGraph: IDeploymentGraph;

    before(() => {
      const uniswapRecipe = buildModule("Uniswap", (m: IDeploymentBuilder) => {
        const abi = [{}];
        const someother = m.contract("Someother");

        const uniswap = m.contractAt("UniswapRouter", "0x123...", abi, {
          after: [someother],
        });

        return { uniswap };
      });

      const { graph } = generateDeploymentGraphFrom(uniswapRecipe, {
        chainId: 31337,
      });

      deploymentGraph = graph;
    });

    it("should create a graph", () => {
      assert.isDefined(deploymentGraph);
    });

    it("should have two nodes", () => {
      assert.equal(deploymentGraph.vertexes.size, 2);
    });

    it("should have the deployed contract node", () => {
      const depNode = getRecipeVertexByLabel(deploymentGraph, "UniswapRouter");

      if (depNode === undefined) {
        return assert.isDefined(depNode);
      }

      assert.equal(depNode?.label, "UniswapRouter");
      assert(isDeployedContract(depNode));
    });

    it("should show one dependencies for the deployed contract node on someother", () => {
      const depNode = getRecipeVertexByLabel(deploymentGraph, "UniswapRouter");

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

      const fromArtifactRecipe = buildModule(
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

      const { graph } = generateDeploymentGraphFrom(fromArtifactRecipe, {
        chainId: 31337,
      });

      deploymentGraph = graph;
    });

    it("should create a graph", () => {
      assert.isDefined(deploymentGraph);
    });

    it("should have two nodes", () => {
      assert.equal(deploymentGraph.vertexes.size, 2);
    });

    it("should have the artifact contract node", () => {
      const depNode = getRecipeVertexByLabel(deploymentGraph, "Foo");

      if (depNode === undefined) {
        return assert.isDefined(depNode);
      }

      assert.equal(depNode?.label, "Foo");
      assert(isArtifactContract(depNode));
    });

    it("should show one dependency for the artifact contract node on Someother", () => {
      const depNode = getRecipeVertexByLabel(deploymentGraph, "Foo");

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
      const depNode = getRecipeVertexByLabel(deploymentGraph, "Foo");

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
    let deploymentGraph: IDeploymentGraph;

    before(() => {
      const librariesRecipe = buildModule(
        "libraries",
        (m: IDeploymentBuilder) => {
          const someother = m.contract("Someother");

          const safeMath = m.library("SafeMath", {
            args: [42],
            after: [someother],
          });

          const contract = m.contract("Contract", {
            libraries: {
              SafeMath: safeMath,
            },
          });

          return { safeMath, contract };
        }
      );

      const { graph } = generateDeploymentGraphFrom(librariesRecipe, {
        chainId: 31,
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
      const depNode = getRecipeVertexByLabel(deploymentGraph, "SafeMath");

      if (depNode === undefined) {
        return assert.isDefined(depNode);
      }

      assert.equal(depNode?.label, "SafeMath");
      assert(isHardhatLibrary(depNode));
    });

    it("should have the contract node Contract", () => {
      const depNode = getRecipeVertexByLabel(deploymentGraph, "Contract");

      if (depNode === undefined) {
        return assert.isDefined(depNode);
      }

      assert.equal(depNode?.label, "Contract");
      assert(isHardhatContract(depNode));
    });

    it("should show one dependencies for the library node SafeMath to Someother", () => {
      const depNode = getRecipeVertexByLabel(deploymentGraph, "SafeMath");

      if (depNode === undefined) {
        return assert.isDefined(depNode);
      }

      const deps = getDependenciesForVertex(deploymentGraph, depNode);

      assert.deepStrictEqual(deps, [{ id: 0, label: "Someother", type: "" }]);
    });

    it("should show one dependency on library node SafeMath for Contract", () => {
      const depNode = getRecipeVertexByLabel(deploymentGraph, "Contract");

      if (depNode === undefined) {
        return assert.isDefined(depNode);
      }

      const deps = getDependenciesForVertex(deploymentGraph, depNode);

      assert.deepStrictEqual(deps, [{ id: 1, label: "SafeMath", type: "" }]);
    });

    it("should record the argument list for the library node SafeMath as [42]", () => {
      const depNode = getRecipeVertexByLabel(deploymentGraph, "SafeMath");

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
      const chainIdRecipe = buildModule("chainId", (m: IDeploymentBuilder) => {
        if (m.chainId === 42) {
          return {};
        }

        assert.fail("Chain id was not injected");

        return {};
      });

      generateDeploymentGraphFrom(chainIdRecipe, { chainId: 42 });
    });
  });

  describe("module parameters", () => {
    let deploymentGraph: IDeploymentGraph;

    before(() => {
      const librariesRecipe = buildSubgraph(
        "libraries",
        (m: IDeploymentBuilder) => {
          const symbol = m.getOptionalParam("tokenSymbol", "TKN");
          const name = m.getParam("tokenName");
          const token = m.contract("Token", {
            args: [symbol, name, 1_000_000],
          });

          return { token };
        }
      );

      const WrapModule = buildModule("Wrap", (m) => {
        const { token } = m.useSubgraph(librariesRecipe, {
          parameters: { tokenSymbol: "EXAMPLE", tokenName: "Example" },
        });

        if (!isCallable(token)) {
          throw new Error("Not callable");
        }

        return { token };
      });

      const { graph } = generateDeploymentGraphFrom(WrapModule, {
        chainId: 31,
      });

      deploymentGraph = graph;
    });

    it("should create a graph", () => {
      assert.isDefined(deploymentGraph);
    });

    it("should have one node", () => {
      assert.equal(deploymentGraph.vertexes.size, 2);
    });
  });

  describe("useModule", () => {
    let deploymentGraph: IDeploymentGraph;
    let returnsWrongFutureType: () => void;
    let differentParams: () => void;

    before(() => {
      const librariesRecipe = buildModule(
        "libraries",
        (m: IDeploymentBuilder) => {
          const symbol = m.getOptionalParam("tokenSymbol", "TKN");
          const name = m.getParam("tokenName");
          const token = m.contract("Token", {
            args: [symbol, name, 1_000_000],
          });

          return { token };
        }
      );

      const WrapRecipe = buildModule("Wrap", (m: IDeploymentBuilder) => {
        const { token } = m.useModule(librariesRecipe, {
          parameters: { tokenSymbol: "EXAMPLE", tokenName: "Example" },
        });

        const { token: token2 } = m.useModule(librariesRecipe, {
          parameters: { tokenSymbol: "EXAMPLE", tokenName: "Example" },
        });

        return { token, token2 };
      });

      const { graph } = generateDeploymentGraphFrom(WrapRecipe, {
        chainId: 31,
      });

      deploymentGraph = graph;

      const DiffParamsRecipe = buildModule("Error", (m: IDeploymentBuilder) => {
        const { token } = m.useModule(librariesRecipe, {
          parameters: { tokenSymbol: "EXAMPLE", tokenName: "Example" },
        });

        const { token: token2 } = m.useModule(librariesRecipe, {
          parameters: { tokenSymbol: "DIFFERENT", tokenName: "Example" },
        });

        return { token, token2 };
      });

      const returnTypeModule = buildModule(
        "returnsParam",
        // @ts-ignore
        // ignoring here to specifically test for js ability to bypass type guards
        (m: IDeploymentBuilder) => {
          const symbol = m.getOptionalParam("tokenSymbol", "TKN");
          const name = m.getParam("tokenName");
          const token = m.contract("Token", {
            args: [symbol, name, 1_000_000],
          });

          return { token, name };
        }
      );

      const ReturnTypeRecipe = buildModule(
        "ReturnsParamRecipe",
        (m: IDeploymentBuilder) => {
          const { token } = m.useModule(returnTypeModule, {
            parameters: { tokenSymbol: "EXAMPLE", tokenName: "Example" },
          });

          return { token };
        }
      );

      returnsWrongFutureType = () => {
        generateDeploymentGraphFrom(ReturnTypeRecipe, { chainId: 31 });
      };

      differentParams = () => {
        generateDeploymentGraphFrom(DiffParamsRecipe, { chainId: 31 });
      };
    });

    it("should create a graph", () => {
      assert.isDefined(deploymentGraph);
    });

    it("should have one node", () => {
      assert.equal(deploymentGraph.vertexes.size, 2);
    });

    it("should not allow using the same module with different parameters", () => {
      assert.throws(
        differentParams,
        /`useModule` cannot be invoked on the same module using different parameters/
      );
    });

    it("should not allow an uncallable future to be returned from a module", () => {
      assert.throws(
        returnsWrongFutureType,
        /Cannot return Future of type "parameter" from a module/
      );
    });
  });
});

function getRecipeVertexByLabel(
  deploymentGraph: DeploymentGraph,
  label: string
): DeploymentGraphVertex | undefined {
  return Array.from(deploymentGraph.vertexes.values()).find(
    (n) => n.label === label
  );
}

function getDependenciesForVertex(
  deploymentGraph: DeploymentGraph,
  { id }: { id: number }
): VertexDescriptor[] {
  const depIds = getDependenciesFor(deploymentGraph.adjacencyList, id);

  return depIds
    .map((depId) => deploymentGraph.vertexes.get(depId))
    .filter(
      (nodeDesc): nodeDesc is DeploymentGraphVertex => nodeDesc !== undefined
    )
    .map((vertex) => ({ id: vertex.id, label: vertex.label, type: "" }));
}
