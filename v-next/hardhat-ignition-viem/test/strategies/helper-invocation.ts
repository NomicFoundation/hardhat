/* eslint-disable import/no-unused-modules */
import {
  NamedArtifactContractDeploymentFuture,
  buildModule,
} from "@ignored/hardhat-vnext-ignition-core";
import { assert } from "chai";

import { IgnitionModuleResultsToViemContracts } from "../../src/ignition-module-results-to-viem-contracts";
import { useIgnitionProject } from "../test-helpers/use-ignition-project";

describe("strategies - invocation via helper", () => {
  const example32ByteSalt =
    "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";

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
          salt: example32ByteSalt,
        },
      });

      assert.equal(
        result.foo.address,
        "0x9318a275A28F46CA742f84402226E27463cA8050"
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
        "0x8EFE40FAEF47066689Cb06b561F5EC63F9DeA616"
      );
    });
  });
});
