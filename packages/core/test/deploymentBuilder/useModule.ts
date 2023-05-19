/* eslint-disable import/no-unused-modules */
import type { IDeploymentGraph } from "../../src/internal/types/deploymentGraph";

import { assert } from "chai";

import { buildModule } from "../../src/buildModule";
import { IgnitionError } from "../../src/errors";
import { generateDeploymentGraphFrom } from "../../src/internal/process/generateDeploymentGraphFrom";
import { isFailure } from "../../src/internal/utils/process-results";
import { IDeploymentBuilder } from "../../src/types/dsl";
import {
  ArtifactContract,
  ContractFutureOld,
  EventFuture,
  HardhatContract,
  LibraryFuture,
  ProxyFuture,
  Virtual,
} from "../../src/types/future";
import { Module } from "../../src/types/module";
import { ProcessResultKind } from "../../src/types/process";

import {
  getDependenciesForVertex,
  getDeploymentVertexByLabel,
} from "./helpers";

describe("deployment builder - useModule", () => {
  let deploymentGraph: IDeploymentGraph;
  const options = {
    chainId: 31,
    accounts: [],
    artifacts: [],
  };

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

      const constructDeploymentGraphResult = generateDeploymentGraphFrom(
        WrapModule,
        options
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
        const module = m.useModule(TokenModule);

        const foo = m.contract("Foo", { after: [module] });

        return { foo };
      });

      const constructDeploymentGraphResult = generateDeploymentGraphFrom(
        WrapModule,
        options
      );

      if (isFailure(constructDeploymentGraphResult)) {
        assert.fail("Construction of deployment graph failed");
      }

      deploymentGraph = constructDeploymentGraphResult.result.graph;
    });

    it("should create a graph", () => {
      assert.isDefined(deploymentGraph);
    });

    it("should have four nodes", () => {
      assert.equal(deploymentGraph.vertexes.size, 4);
    });

    it("should have the Token node", () => {
      const depNode = getDeploymentVertexByLabel(deploymentGraph, "Token");

      assert.isDefined(depNode);
      assert.equal(depNode?.label, "Token");
    });

    it("should show the Token node depending on the modules before virtual node", () => {
      const depNode = getDeploymentVertexByLabel(deploymentGraph, "Token");

      if (depNode === undefined) {
        return assert.isDefined(depNode);
      }

      const deps = getDependenciesForVertex(deploymentGraph, depNode);

      assert.deepStrictEqual(deps, [
        {
          id: 0,
          label: "TokenModule:0::before",
          type: "",
        },
      ]);
    });

    it("should have the Foo node", () => {
      const depNode = getDeploymentVertexByLabel(deploymentGraph, "Foo");

      assert.isDefined(depNode);
      assert.equal(depNode?.label, "Foo");
    });

    it("should foo depending on the after virtual node of the TokenModule", () => {
      const depNode = getDeploymentVertexByLabel(deploymentGraph, "Foo");

      if (depNode === undefined) {
        return assert.isDefined(depNode);
      }

      const deps = getDependenciesForVertex(deploymentGraph, depNode);

      assert.deepStrictEqual(deps, [
        { id: 2, label: "TokenModule:0::after", type: "" },
      ]);
    });
  });

  describe("depending on a contract within a module", () => {
    before(() => {
      const TokenModule = buildModule(
        "TokenModule",
        (m: IDeploymentBuilder) => {
          const token = m.contract("Token");

          return { token };
        }
      );

      const WrapModule = buildModule("Wrap", (m: IDeploymentBuilder) => {
        const { token } = m.useModule(TokenModule);

        const foo = m.contract("Foo", { after: [token] });

        return { foo };
      });

      const constructDeploymentGraphResult = generateDeploymentGraphFrom(
        WrapModule,
        options
      );

      if (isFailure(constructDeploymentGraphResult)) {
        assert.fail("Construction of deployment graph failed");
      }

      deploymentGraph = constructDeploymentGraphResult.result.graph;
    });

    it("should create a graph", () => {
      assert.isDefined(deploymentGraph);
    });

    it("should have four nodes", () => {
      assert.equal(deploymentGraph.vertexes.size, 4);
    });

    it("should show foo depending on the after virtual node of the TokenModule (magic of proxy)", () => {
      const depNode = getDeploymentVertexByLabel(deploymentGraph, "Foo");

      if (depNode === undefined) {
        return assert.isDefined(depNode);
      }

      const deps = getDependenciesForVertex(deploymentGraph, depNode);

      assert.deepStrictEqual(deps, [
        { id: 2, label: "TokenModule:0::after", type: "" },
      ]);
    });
  });

  describe("a module depending on a contract", () => {
    before(() => {
      const TokenModule = buildModule(
        "TokenModule",
        (m: IDeploymentBuilder) => {
          const bar = m.contract("Bar");
          const baz = m.contract("Baz");

          return { bar, baz };
        }
      );

      const WrapModule = buildModule("Wrap", (m: IDeploymentBuilder) => {
        const foo = m.contract("Foo");

        const { bar, baz } = m.useModule(TokenModule, { after: [foo] });

        return { foo, bar, baz };
      });

      const constructDeploymentGraphResult = generateDeploymentGraphFrom(
        WrapModule,
        options
      );

      if (isFailure(constructDeploymentGraphResult)) {
        assert.fail("Construction of deployment graph failed");
      }

      deploymentGraph = constructDeploymentGraphResult.result.graph;
    });

    it("should create a graph", () => {
      assert.isDefined(deploymentGraph);
    });

    it("should have five nodes", () => {
      assert.equal(deploymentGraph.vertexes.size, 5);
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

    it("should have the Baz node", () => {
      const depNode = getDeploymentVertexByLabel(deploymentGraph, "Baz");

      assert.isDefined(depNode);
      assert.equal(depNode?.label, "Baz");
    });

    it("should show Bar depending on the module before node", () => {
      const depNode = getDeploymentVertexByLabel(deploymentGraph, "Bar");

      if (depNode === undefined) {
        return assert.isDefined(depNode);
      }

      const deps = getDependenciesForVertex(deploymentGraph, depNode);

      assert.deepStrictEqual(deps, [
        { id: 1, label: "TokenModule:0::before", type: "" },
      ]);
    });

    it("should show Baz depending on the module before node", () => {
      const depNode = getDeploymentVertexByLabel(deploymentGraph, "Baz");

      if (depNode === undefined) {
        return assert.isDefined(depNode);
      }

      const deps = getDependenciesForVertex(deploymentGraph, depNode);

      assert.deepStrictEqual(deps, [
        { id: 1, label: "TokenModule:0::before", type: "" },
      ]);
    });

    it("should show module before virtual vertex depending on the Foo contract", () => {
      const depNode = getDeploymentVertexByLabel(
        deploymentGraph,
        "TokenModule:0::before"
      );

      if (depNode === undefined) {
        return assert.isDefined(depNode);
      }

      const deps = getDependenciesForVertex(deploymentGraph, depNode);

      assert.deepStrictEqual(deps, [{ id: 0, label: "Foo", type: "" }]);
    });
  });

  describe("a module depending on a module", () => {
    before(() => {
      const FooModule = buildModule("FooModule", (m: IDeploymentBuilder) => {
        const foo = m.contract("Foo");

        return { foo };
      });

      const BarModule = buildModule("BarModule", (m: IDeploymentBuilder) => {
        const bar = m.contract("Bar");

        return { bar };
      });

      const WrapModule = buildModule("Wrap", (m: IDeploymentBuilder) => {
        const fooModule = m.useModule(FooModule);
        const { bar } = m.useModule(BarModule, { after: [fooModule] });

        return { foo: fooModule.foo, bar };
      });

      const constructDeploymentGraphResult = generateDeploymentGraphFrom(
        WrapModule,
        options
      );

      if (isFailure(constructDeploymentGraphResult)) {
        assert.fail("Construction of deployment graph failed");
      }

      deploymentGraph = constructDeploymentGraphResult.result.graph;
    });

    it("should create a graph", () => {
      assert.isDefined(deploymentGraph);
    });

    it("should have six nodes", () => {
      assert.equal(deploymentGraph.vertexes.size, 6);
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

    it("should show Bar depending on the module before node", () => {
      const depNode = getDeploymentVertexByLabel(deploymentGraph, "Bar");

      if (depNode === undefined) {
        return assert.isDefined(depNode);
      }

      const deps = getDependenciesForVertex(deploymentGraph, depNode);

      assert.deepStrictEqual(deps, [
        { id: 3, label: "BarModule:1::before", type: "" },
      ]);
    });

    it("should show bar module before virtual vertex depending on the Foo module after virtual vertex", () => {
      const depNode = getDeploymentVertexByLabel(
        deploymentGraph,
        "BarModule:1::before"
      );

      if (depNode === undefined) {
        return assert.isDefined(depNode);
      }

      const deps = getDependenciesForVertex(deploymentGraph, depNode);

      assert.deepStrictEqual(deps, [
        { id: 2, label: "FooModule:0::after", type: "" },
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

      const constructDeploymentGraphResult = generateDeploymentGraphFrom(
        TopModule,
        options
      );

      if (isFailure(constructDeploymentGraphResult)) {
        assert.fail("Construction of deployment graph failed");
      }

      deploymentGraph = constructDeploymentGraphResult.result.graph;
    });

    it("should create a graph", () => {
      assert.isDefined(deploymentGraph);
    });

    it("should have six nodes", () => {
      assert.equal(deploymentGraph.vertexes.size, 6);
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

    it("should show one dependencies, between Bar and Middle module", () => {
      const depNode = getDeploymentVertexByLabel(deploymentGraph, "Bar");

      if (depNode === undefined) {
        return assert.isDefined(depNode);
      }

      const deps = getDependenciesForVertex(deploymentGraph, depNode);

      assert.deepStrictEqual(deps, [
        { id: 4, label: "Middle:0::after", type: "" },
      ]);
    });
  });

  describe("reusing the same module with different parameters", () => {
    let differentParamsModule: Module<{
      token: HardhatContract | ArtifactContract;
      token2: HardhatContract | ArtifactContract;
    }>;

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

    it("should fail with an error", () => {
      const result = generateDeploymentGraphFrom(
        differentParamsModule,
        options
      );

      assert.deepStrictEqual(result, {
        _kind: ProcessResultKind.FAILURE,
        message: "Deployment graph construction failed",
        failures: [
          new IgnitionError(
            "`useModule` cannot be invoked on the same module using different parameters"
          ),
        ],
      });
    });
  });

  describe("returning non contract futures from within a module", () => {
    // @ts-ignore
    let returnsWrongFutureTypeModule: Module<{
      token:
        | ContractFutureOld
        | LibraryFuture
        | Virtual
        | ProxyFuture
        | EventFuture;
    }>;

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

    it("should fail with an error", () => {
      const result = generateDeploymentGraphFrom(
        // @ts-ignore
        returnsWrongFutureTypeModule,
        {
          chainId: 31,
          accounts: [],
          artifacts: [],
        }
      );

      assert.deepStrictEqual(result, {
        _kind: ProcessResultKind.FAILURE,
        message: "Deployment graph construction failed",
        failures: [
          new IgnitionError(
            'Cannot return Future of type "parameter" from a module'
          ),
        ],
      });
    });
  });
});
