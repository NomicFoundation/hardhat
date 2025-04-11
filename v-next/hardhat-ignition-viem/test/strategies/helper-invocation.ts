import type { IgnitionModuleResultsToViemContracts } from "../../src/types.js";
import type { NamedArtifactContractDeploymentFuture } from "@nomicfoundation/ignition-core";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { assertRejectsWithHardhatError } from "@nomicfoundation/hardhat-test-utils";
import { buildModule } from "@nomicfoundation/ignition-core";
import { assert } from "chai";

import { useIgnitionProject } from "../test-helpers/use-ignition-project.js";

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

      result = await this.connection.ignition.deploy(moduleDefinition, {
        strategy: "create2",
        strategyConfig: {
          salt: example32ByteSalt,
        },
      });

      assert.equal(
        result.foo.address,
        "0x9318a275A28F46CA742f84402226E27463cA8050",
      );
    });

    it("should error on create2 when passed bad config", async function () {
      const moduleDefinition = buildModule("Module", (m) => {
        const foo = m.contract("Foo");

        return { foo };
      });

      await assertRejectsWithHardhatError(
        this.connection.ignition.deploy(moduleDefinition, {
          strategy: "create2",
          strategyConfig: {
            // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- we're testing this specific error
            salt: undefined as any,
          },
        }),
        HardhatError.ERRORS.IGNITION.STRATEGIES.MISSING_CONFIG_PARAM,
        {
          strategyName: "create2",
          requiredParam: "salt",
        },
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

      result = await this.connection.ignition.deploy(moduleDefinition, {
        strategy: "create2",
      });

      assert.equal(
        result.baz.address,
        "0x8EFE40FAEF47066689Cb06b561F5EC63F9DeA616",
      );
    });
  });
});
