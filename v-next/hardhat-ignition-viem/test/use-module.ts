import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { useEphemeralFixtureProject } from "@nomicfoundation/hardhat-test-utils";
import { buildModule } from "@nomicfoundation/ignition-core";

import { createConnection } from "./test-helpers/create-hre.js";

describe("viem results should work across useModule boundaries", () => {
  useEphemeralFixtureProject("minimal");

  it("should only return properties for the properties of the module results", async function () {
    const submoduleDefinition = buildModule("Submodule", (m) => {
      const foo = m.contract("Foo");

      return { foo };
    });

    const moduleDefinition = buildModule("Module", (m) => {
      const { foo } = m.useModule(submoduleDefinition);

      return { foo };
    });

    const connection = await createConnection();

    const result = await connection.ignition.deploy(moduleDefinition);

    assert.equal(await result.foo.read.x(), 1n);

    await result.foo.write.inc();
    await result.foo.write.inc();

    assert.equal(await result.foo.read.x(), 3n);
  });
});
