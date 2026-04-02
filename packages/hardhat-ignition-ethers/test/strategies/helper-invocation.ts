import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import {
  assertRejectsWithHardhatError,
  useEphemeralFixtureProject,
} from "@nomicfoundation/hardhat-test-utils";
import { buildModule } from "@nomicfoundation/ignition-core";

import { createConnection } from "../test-helpers/create-hre.js";

describe("strategies - invocation via helper", () => {
  const example32ByteSalt =
    "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";

  describe("no Hardhat config setup", () => {
    useEphemeralFixtureProject("minimal");

    it("should execute create2 when passed config programmatically via helper", async function () {
      const moduleDefinition = buildModule("Module", (m) => {
        const foo = m.contract("Foo");

        return { foo };
      });

      const connection = await createConnection();

      const result = await connection.ignition.deploy(moduleDefinition, {
        strategy: "create2",
        strategyConfig: {
          salt: example32ByteSalt,
        },
      });

      assert.equal(
        await result.foo.getAddress(),
        "0xA0737dC2423c9826595aB92bDEE1e7760DBa688C",
      );
    });

    it("should error on create2 when passed bad config", async function () {
      const moduleDefinition = buildModule("Module", (m) => {
        const foo = m.contract("Foo");

        return { foo };
      });

      const connection = await createConnection();

      await assertRejectsWithHardhatError(
        connection.ignition.deploy(moduleDefinition, {
          strategy: "create2",
          strategyConfig: {
            // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- we're testing a bad config
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
    useEphemeralFixtureProject("create2");

    it("should execute create2 with the helper loading the Hardhat config", async function () {
      const moduleDefinition = buildModule("Module", (m) => {
        const foo = m.contract("Foo");

        return { foo };
      });

      const connection = await createConnection();

      const result = await connection.ignition.deploy(moduleDefinition, {
        strategy: "create2",
      });

      assert.equal(
        await result.foo.getAddress(),
        "0xC6946971a6EE35416fAB8a0fdB1e08d74a192402",
      );
    });
  });
});
