/* eslint-disable import/no-unused-modules */
import { assert } from "chai";

import { buildModule } from "dsl/buildModule";
import { generateDeploymentGraphFrom } from "process/generateDeploymentGraphFrom";
import type {
  IDeploymentGraph,
  IDeploymentBuilder,
} from "types/deploymentGraph";
import { Module } from "types/module";

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

    it("should have one node", () => {
      assert.equal(deploymentGraph.vertexes.size, 2);
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
