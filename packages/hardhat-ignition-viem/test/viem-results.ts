import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import {
  assertRejects,
  assertRejectsWithHardhatError,
  useEphemeralFixtureProject,
} from "@nomicfoundation/hardhat-test-utils";
import { buildModule } from "@nomicfoundation/ignition-core";

import { createConnection } from "./test-helpers/create-hre.js";
import { externallyLoadedContractArtifact } from "./test-helpers/externally-loaded-contract.js";

describe("viem results", () => {
  useEphemeralFixtureProject("minimal");

  it("should only return properties for the properties of the module results", async function () {
    const moduleDefinition = buildModule("Module", (m) => {
      const foo = m.contract("Foo");

      return { foo };
    });

    const connection = await createConnection();

    const result = await connection.ignition.deploy(moduleDefinition);

    assert.notEqual(result.foo, undefined);

    // @ts-expect-error -- Expect an error
    assert.equal(result.nonexistant, undefined);
  });

  it("should differentiate between different contracts in the type system", async function () {
    const moduleDefinition = buildModule("Module", (m) => {
      const foo = m.contract("Foo");
      const bar = m.contract("Bar");
      const baz = m.contract("Bas", externallyLoadedContractArtifact);

      return { foo, bar, baz };
    });

    const connection = await createConnection();

    const result = await connection.ignition.deploy(moduleDefinition);

    assert.ok(await result.foo.read.isFoo(), "foo should be foo");
    assert.ok(await result.bar.read.isBar(), "bar should be bar");
    assert.ok(await result.baz.read.isExternallyLoaded(), "baz should be baz");

    // Calling the wrong method on a viem instance should throw, but more
    // importantly give a type error.

    // foo shouldn't have bar or baz methods
    await assertRejects(
      // @ts-expect-error - isBar is not a method on Foo
      result.foo.read.isBar(),
    );
    await assertRejects(
      // @ts-expect-error - isBar is not a method on Foo
      result.foo.read.isExternallyLoaded(),
    );

    // bar shouldn't have foo or baz methods
    await assertRejects(
      // @ts-expect-error - isFoo is not a method on Bar
      result.bar.read.isFoo(),
    );
    await assertRejects(
      // @ts-expect-error - isExternallyLoaded is not a method on Bar
      result.bar.read.isExternallyLoaded(),
    );

    // baz shouldn't have foo or bar methods
    await assertRejects(
      // @ts-expect-error - isFoo is not a method on the externally loaded contract
      result.baz.read.isFoo(),
    );
    await assertRejects(
      // @ts-expect-error - isBar is not a method on the externally loaded contract
      result.baz.read.isBar(),
    );
  });

  describe("concurrent invocations of deploy", () => {
    it("should throw when modules are deployed concurrently", async function () {
      const moduleDefinition = buildModule("Module", (m) => {
        const foo = m.contract("Foo");

        return { foo };
      });

      const connection = await createConnection();

      await assertRejectsWithHardhatError(
        async () => {
          await Promise.all([
            connection.ignition.deploy(moduleDefinition),
            connection.ignition.deploy(moduleDefinition),
            connection.ignition.deploy(moduleDefinition),
          ]);
        },
        HardhatError.ERRORS.IGNITION.DEPLOY.ALREADY_IN_PROGRESS,
        {},
      );
    });

    it("should allow subsequent deploys if the first deploy fails", async function () {
      const connection = await createConnection();

      const badModuleDefinition = buildModule("BadModule", (m) => {
        const foo = m.contract("Nonexistant");

        return { foo };
      });

      await assertRejectsWithHardhatError(
        () => {
          return connection.ignition.deploy(badModuleDefinition);
        },
        HardhatError.ERRORS.CORE.ARTIFACTS.NOT_FOUND,
        {
          contractName: "Nonexistant",
          suggestion: "",
        },
      );

      const goodModuleDefinition = buildModule("Module", (m) => {
        const foo = m.contract("Foo");

        return { foo };
      });

      const result = await connection.ignition.deploy(goodModuleDefinition);

      assert.equal(await result.foo.read.x(), 1n);
    });
  });
});
