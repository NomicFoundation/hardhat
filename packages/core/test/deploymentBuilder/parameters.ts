/* eslint-disable import/no-unused-modules */
import type {
  IDeploymentGraph,
  IDeploymentBuilder,
} from "../../src/internal/types/deploymentGraph";

import { assert } from "chai";

import { buildModule } from "../../src/dsl/buildModule";
import { IgnitionError } from "../../src/errors";
import { generateDeploymentGraphFrom } from "../../src/internal/process/generateDeploymentGraphFrom";
import { isCallable } from "../../src/internal/utils/guards";

describe("deployment builder - parameters", function () {
  let deploymentGraph: IDeploymentGraph;

  before(() => {
    const librariesSubmodule = buildModule(
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
      const { token } = m.useModule(librariesSubmodule, {
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
      artifacts: [],
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
