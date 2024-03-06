/* eslint-disable import/no-unused-modules */
import {
  NamedArtifactContractDeploymentFuture,
  buildModule,
} from "@nomicfoundation/ignition-core";
import { assert } from "chai";

import { IgnitionModuleResultsToViemContracts } from "../../src/ignition-module-results-to-viem-contracts";
import { useIgnitionProject } from "../test-helpers/use-ignition-project";

describe("strategies - invocation via helper", () => {
  describe("no Hardhat config setup", () => {
    useIgnitionProject("minimal");

    let result: IgnitionModuleResultsToViemContracts<
      string,
      {
        foo: NamedArtifactContractDeploymentFuture<"Foo">;
      }
    >;

    it("should execute create2 when passed config programmatically via helper", async function () {
      const moduleDefinition = buildModule("Module", (m) => {
        const foo = m.contract("Foo");

        return { foo };
      });

      result = await this.hre.ignition.deploy(moduleDefinition, {
        strategy: "create2",
        strategyConfig: {
          salt: "test-salt",
        },
      });

      assert.equal(
        result.foo.address,
        "0xA851627726C4Cc6150AE804Bcb2BF43BBFC1B3AD"
      );
    });

    it("should error on create2 when passed bad config", async function () {
      const moduleDefinition = buildModule("Module", (m) => {
        const foo = m.contract("Foo");

        return { foo };
      });

      await assert.isRejected(
        this.hre.ignition.deploy(moduleDefinition, {
          strategy: "create2",
          strategyConfig: {
            salt: undefined as any,
          },
        }),
        /IGN1102: Missing required strategy configuration parameter 'salt' for the strategy 'create2'/
      );
    });
  });

  describe("Hardhat config setup with create2 config", () => {
    useIgnitionProject("create2");

    let result: IgnitionModuleResultsToViemContracts<
      string,
      {
        baz: NamedArtifactContractDeploymentFuture<"Baz">;
      }
    >;

    it("should execute create2 with the helper loading the Hardhat config", async function () {
      const moduleDefinition = buildModule("Module", (m) => {
        const baz = m.contract("Baz");

        return { baz };
      });

      result = await this.hre.ignition.deploy(moduleDefinition, {
        strategy: "create2",
      });

      assert.equal(
        result.baz.address,
        "0x6ad123c48167C25Dc3EfC8320A5Ae3BE72B67419"
      );
    });
  });
});
