/* eslint-disable import/no-unused-modules */
import { assert } from "chai";

import { buildModule } from "dsl/buildModule";
import { generateDeploymentGraphFrom } from "process/generateDeploymentGraphFrom";
import type {
  IDeploymentGraph,
  IDeploymentBuilder,
} from "types/deploymentGraph";

describe("deployment builder - useModule", () => {
  let deploymentGraph: IDeploymentGraph;
  let returnsWrongFutureType: () => void;
  let differentParams: () => void;

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

    const DiffParamsModule = buildModule("Error", (m: IDeploymentBuilder) => {
      const { token } = m.useModule(librariesModule, {
        parameters: { tokenSymbol: "EXAMPLE", tokenName: "Example" },
      });

      const { token: token2 } = m.useModule(librariesModule, {
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

    const ReturnTypeModule = buildModule(
      "ReturnsParamModule",
      (m: IDeploymentBuilder) => {
        const { token } = m.useModule(returnTypeModule, {
          parameters: { tokenSymbol: "EXAMPLE", tokenName: "Example" },
        });

        return { token };
      }
    );

    returnsWrongFutureType = () => {
      generateDeploymentGraphFrom(ReturnTypeModule, { chainId: 31 });
    };

    differentParams = () => {
      generateDeploymentGraphFrom(DiffParamsModule, { chainId: 31 });
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
