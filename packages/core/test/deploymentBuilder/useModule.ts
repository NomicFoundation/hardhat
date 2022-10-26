/* eslint-disable import/no-unused-modules */
import { assert } from "chai";

import { buildModule } from "dsl/buildModule";
import { generateDeploymentGraphFrom } from "process/generateDeploymentGraphFrom";
import type {
  IDeploymentGraph,
  IDeploymentBuilder,
} from "types/deploymentGraph";
import { Module } from "types/module";

import {
  getDependenciesForVertex,
  getDeploymentVertexByLabel,
} from "./helpers";

describe("deployment builder - useModule", () => {
  let deploymentGraph: IDeploymentGraph;

  describe("use one module from another", () => {
    before(() => {
      const librariesModule = buildModule(
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

      const WrapModule = buildModule("Wrap", (m: IDeploymentBuilder) => {
        const { token } = m.useModule(librariesModule, {
          parameters: { tokenSymbol: "EXAMPLE", tokenName: "Example" },
        });

        const { token: token2 } = m.useModule(librariesModule, {
          parameters: { tokenSymbol: "EXAMPLE", tokenName: "Example" },
        });

        return { token, token2 };
      });

      const { graph } = generateDeploymentGraphFrom(WrapModule, {
        chainId: 31,
      });

      deploymentGraph = graph;
    });

    it("should create a graph", () => {
      assert.isDefined(deploymentGraph);
    });

    it("should have two nodes", () => {
      assert.equal(deploymentGraph.vertexes.size, 2);
    });
  });

  describe("depending on a module", () => {
    before(() => {
      const TokenModule = buildModule(
        "TokenModule",
        (m: IDeploymentBuilder) => {
          const token = m.contract("Token");

          return { token };
        }
      );

      const WrapModule = buildModule("Wrap", (m: IDeploymentBuilder) => {
        const { module } = m.useModule(TokenModule);

        const foo = m.contract("Foo", { after: [module] });

        return { foo };
      });

      const { graph } = generateDeploymentGraphFrom(WrapModule, {
        chainId: 31,
      });

      deploymentGraph = graph;
    });

    it("should create a graph", () => {
      assert.isDefined(deploymentGraph);
    });

    it("should have three node", () => {
      assert.equal(deploymentGraph.vertexes.size, 3);
    });

    it("should have the Token node", () => {
      const depNode = getDeploymentVertexByLabel(deploymentGraph, "Token");

      assert.isDefined(depNode);
      assert.equal(depNode?.label, "Token");
    });

    it("should show no dependencies for the Token node", () => {
      const depNode = getDeploymentVertexByLabel(deploymentGraph, "Token");

      if (depNode === undefined) {
        return assert.isDefined(depNode);
      }

      const deps = getDependenciesForVertex(deploymentGraph, depNode);

      assert.deepStrictEqual(deps, []);
    });

    it("should have the Foo node", () => {
      const depNode = getDeploymentVertexByLabel(deploymentGraph, "Foo");

      assert.isDefined(depNode);
      assert.equal(depNode?.label, "Foo");
    });

    it("should show one dependencies, on Foo for the virtual node of the module", () => {
      const depNode = getDeploymentVertexByLabel(deploymentGraph, "Foo");

      if (depNode === undefined) {
        return assert.isDefined(depNode);
      }

      const deps = getDependenciesForVertex(deploymentGraph, depNode);

      assert.deepStrictEqual(deps, [
        { id: 1, label: "TokenModule:0", type: "" },
      ]);
    });
  });

  describe("nesting modules within modules within modules", () => {
    before(() => {
      const BottomModule = buildModule("Bottom", (m: IDeploymentBuilder) => {
        const foo = m.contract("Foo");

        return { foo };
      });

      const MiddleModule = buildModule("Middle", (m: IDeploymentBuilder) => {
        const { foo } = m.useModule(BottomModule);

        return { foo };
      });

      const TopModule = buildModule("Top", (m: IDeploymentBuilder) => {
        const { foo } = m.useModule(MiddleModule);

        const bar = m.contract("Bar", { args: [foo] });

        return { foo, bar };
      });

      const { graph } = generateDeploymentGraphFrom(TopModule, {
        chainId: 31,
      });

      deploymentGraph = graph;
    });

    it("should create a graph", () => {
      assert.isDefined(deploymentGraph);
    });

    it("should have three nodes", () => {
      assert.equal(deploymentGraph.vertexes.size, 4);
    });

    it("should have the Foo node", () => {
      const depNode = getDeploymentVertexByLabel(deploymentGraph, "Foo");

      assert.isDefined(depNode);
      assert.equal(depNode?.label, "Foo");
    });

    it("should have the Bar node", () => {
      const depNode = getDeploymentVertexByLabel(deploymentGraph, "Bar");

      assert.isDefined(depNode);
      assert.equal(depNode?.label, "Bar");
    });

    it("should show one dependencies, between Bar and Foo", () => {
      const depNode = getDeploymentVertexByLabel(deploymentGraph, "Bar");

      if (depNode === undefined) {
        return assert.isDefined(depNode);
      }

      const deps = getDependenciesForVertex(deploymentGraph, depNode);

      assert.deepStrictEqual(deps, [{ id: 0, label: "Foo", type: "" }]);
    });
  });

  describe("reusing the same module with different parameters", () => {
    let differentParamsModule: Module;

    before(() => {
      const librariesModule = buildModule(
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

      differentParamsModule = buildModule("Error", (m: IDeploymentBuilder) => {
        const { token } = m.useModule(librariesModule, {
          parameters: { tokenSymbol: "EXAMPLE", tokenName: "Example" },
        });

        const { token: token2 } = m.useModule(librariesModule, {
          parameters: { tokenSymbol: "DIFFERENT", tokenName: "Example" },
        });

        return { token, token2 };
      });
    });

    it("should throw", () => {
      assert.throws(
        () =>
          generateDeploymentGraphFrom(differentParamsModule, {
            chainId: 31,
          }),
        /`useModule` cannot be invoked on the same module using different parameters/
      );
    });
  });

  describe("returning non contract/library futures from within a module", () => {
    let returnsWrongFutureTypeModule: Module;

    before(() => {
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

      returnsWrongFutureTypeModule = buildModule(
        "ReturnsParamModule",
        (m: IDeploymentBuilder) => {
          const { token } = m.useModule(returnTypeModule, {
            parameters: { tokenSymbol: "EXAMPLE", tokenName: "Example" },
          });

          return { token };
        }
      );
    });

    it("should throw", () => {
      assert.throws(
        () =>
          generateDeploymentGraphFrom(returnsWrongFutureTypeModule, {
            chainId: 31,
          }),
        /Cannot return Future of type "parameter" from a module/
      );
    });
  });
});
