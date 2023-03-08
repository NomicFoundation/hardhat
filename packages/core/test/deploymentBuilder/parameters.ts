/* eslint-disable import/no-unused-modules */
import { assert } from "chai";

import { buildModule } from "dsl/buildModule";
import { buildSubgraph } from "dsl/buildSubgraph";
import { generateDeploymentGraphFrom } from "process/generateDeploymentGraphFrom";
import type {
  IDeploymentGraph,
  IDeploymentBuilder,
} from "types/deploymentGraph";
import { IgnitionError } from "utils/errors";
import { isCallable } from "utils/guards";

describe("deployment builder - parameters", function () {
  let deploymentGraph: IDeploymentGraph;

  before(() => {
    const librariesSubgraph = buildSubgraph(
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
      const { token } = m.useSubgraph(librariesSubgraph, {
        parameters: { tokenSymbol: "EXAMPLE", tokenName: "Example" },
      });

      if (!isCallable(token)) {
        throw new IgnitionError("Not callable");
      }

      return { token };
    });

    const { graph } = generateDeploymentGraphFrom(WrapModule, {
      chainId: 31,
      accounts: [],
    });

    deploymentGraph = graph;
  });

  it("should create a graph", () => {
    assert.isDefined(deploymentGraph);
  });

  it("should have three nodes", () => {
    assert.equal(deploymentGraph.vertexes.size, 3);
  });
});
