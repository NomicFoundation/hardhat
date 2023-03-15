/* eslint-disable import/no-unused-modules */
import type {
  IDeploymentGraph,
  IDeploymentBuilder,
} from "../../src/types/deploymentGraph";

import { assert } from "chai";

import { buildModule } from "../../src/dsl/buildModule";
import { buildSubgraph } from "../../src/dsl/buildSubgraph";
import { generateDeploymentGraphFrom } from "../../src/process/generateDeploymentGraphFrom";
import { IgnitionError } from "../../src/utils/errors";
import { isCallable } from "../../src/utils/guards";

import {
  getDependenciesForVertex,
  getDeploymentVertexByLabel,
} from "./helpers";

describe("deployment builder - useSubgraph", () => {
  let deploymentGraph: IDeploymentGraph;
  const options = {
    chainId: 31,
    accounts: [],
  };

  describe("use subgraph from within a module", () => {
    before(() => {
      const BarSubgraph = buildSubgraph(
        "BarSubgraph",
        (m: IDeploymentBuilder) => {
          const bar = m.contract("Bar");

          return { bar };
        }
      );

      const WrapModule = buildModule("Wrap", (m) => {
        const foo = m.contract("Foo");

        const { bar } = m.useSubgraph(BarSubgraph, {
          after: [foo],
        });

        if (!isCallable(bar)) {
          throw new IgnitionError("Not callable");
        }

        return { foo, bar };
      });

      const { graph } = generateDeploymentGraphFrom(WrapModule, options);

      deploymentGraph = graph;
    });

    it("should create a graph", () => {
      assert.isDefined(deploymentGraph);
    });

    it("should have four nodes", () => {
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

    it("should show bar depending on the subgraph before node", () => {
      const depNode = getDeploymentVertexByLabel(deploymentGraph, "Bar");

      if (depNode === undefined) {
        return assert.isDefined(depNode);
      }

      const deps = getDependenciesForVertex(deploymentGraph, depNode);

      assert.deepStrictEqual(deps, [
        { id: 1, label: "BarSubgraph:0::before", type: "" },
      ]);
    });

    it("should show the subgraph before node dependent on Foo", () => {
      const depNode = getDeploymentVertexByLabel(
        deploymentGraph,
        "BarSubgraph:0::before"
      );

      if (depNode === undefined) {
        return assert.isDefined(depNode);
      }

      const deps = getDependenciesForVertex(deploymentGraph, depNode);

      assert.deepStrictEqual(deps, [{ id: 0, label: "Foo", type: "" }]);
    });
  });

  describe("depened on a subgraph", () => {
    before(() => {
      const FooSubgraph = buildSubgraph("BarSubgraph", (m) => {
        const foo = m.contract("Foo");

        return { foo };
      });

      const WrapModule = buildModule("Wrap", (m) => {
        const fooSubgraph = m.useSubgraph(FooSubgraph);

        const bar = m.contract("Bar", {
          after: [fooSubgraph],
        });

        return { foo: fooSubgraph.foo, bar };
      });

      const { graph } = generateDeploymentGraphFrom(WrapModule, options);

      deploymentGraph = graph;
    });

    it("should create a graph", () => {
      assert.isDefined(deploymentGraph);
    });

    it("should have four nodes", () => {
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

    it("should show bar depending on the subgraph after node", () => {
      const depNode = getDeploymentVertexByLabel(deploymentGraph, "Bar");

      if (depNode === undefined) {
        return assert.isDefined(depNode);
      }

      const deps = getDependenciesForVertex(deploymentGraph, depNode);

      assert.deepStrictEqual(deps, [
        { id: 2, label: "BarSubgraph:0::after", type: "" },
      ]);
    });
  });
});
