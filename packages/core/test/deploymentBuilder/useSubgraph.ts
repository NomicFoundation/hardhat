/* eslint-disable import/no-unused-modules */
import { assert } from "chai";

import { buildModule } from "dsl/buildModule";
import { buildSubgraph } from "dsl/buildSubgraph";
import { generateDeploymentGraphFrom } from "process/generateDeploymentGraphFrom";
import type {
  IDeploymentGraph,
  IDeploymentBuilder,
} from "types/deploymentGraph";
import { isCallable } from "utils/guards";

import {
  getDependenciesForVertex,
  getDeploymentVertexByLabel,
} from "./helpers";

describe("deployment builder - useSubgraph", () => {
  let deploymentGraph: IDeploymentGraph;

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
          throw new Error("Not callable");
        }

        return { foo, bar };
      });

      const { graph } = generateDeploymentGraphFrom(WrapModule, {
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
});
