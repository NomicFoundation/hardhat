import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { useEphemeralFixtureProject } from "@nomicfoundation/hardhat-test-utils";
import { buildModule } from "@nomicfoundation/ignition-core";

import { createConnection } from "./test-helpers/create-hre.js";
import { externallyLoadedContractArtifact } from "./test-helpers/externally-loaded-contract.js";

describe("deploy with ethers result", () => {
  useEphemeralFixtureProject("minimal");

  it("should get return ethers result from deploy", async function () {
    const moduleDefinition = buildModule("Module", (m) => {
      const foo = m.contract("Foo");
      const fooAt = m.contractAt("Foo", foo, { id: "FooAt" });

      return { foo, fooAt };
    });

    const connection = await createConnection();

    const result = await connection.ignition.deploy(moduleDefinition);

    assert.equal(await result.foo.x(), 1n);
    assert.equal(await result.fooAt.x(), 1n);
  });

  it("should get return a deployed contract as an ethers contract instance", async function () {
    const moduleDefinition = buildModule("Module", (m) => {
      const foo = m.contract("Foo");

      return { foo };
    });

    const connection = await createConnection();

    const result = await connection.ignition.deploy(moduleDefinition);

    assert.equal(await result.foo.x(), 1n);
  });

  it("should get return a contractAt as an ethers contract instance", async function () {
    const moduleDefinition = buildModule("Module", (m) => {
      const foo = m.contract("Foo");
      const contractAtFoo = m.contractAt("Foo", foo, { id: "ContractAtFoo" });

      return { contractAtFoo };
    });

    const connection = await createConnection();

    const result = await connection.ignition.deploy(moduleDefinition);

    assert.equal(await result.contractAtFoo.x(), 1n);
  });

  it("should return a contract loaded from an arbitrary artifact as an ethers instance", async function () {
    const moduleDefinition = buildModule("Module", (m) => {
      const externallyLoadedContract = m.contract(
        "ExternallyLoadedContract",
        externallyLoadedContractArtifact,
        [],
        { id: "ExternallyLoadedContract" },
      );

      return { externallyLoadedContract };
    });

    const connection = await createConnection();

    const result = await connection.ignition.deploy(moduleDefinition);

    assert.equal(
      await result.externallyLoadedContract.isExternallyLoaded(),
      true,
    );
  });

  it("should differentiate between different contracts in the type system", async function () {
    const moduleDefinition = buildModule("Module", (m) => {
      const foo = m.contract("Foo");
      const bar = m.contract("Bar");

      return { foo, bar };
    });

    const connection = await createConnection();

    const result = await connection.ignition.deploy(moduleDefinition);

    assert.equal(await result.foo.isFoo(), true);
    assert.equal(await result.bar.isBar(), true);

    // A function on the abi will not be defined on the ethers contract,
    // but more importantly should show up as a type error.

    // TODO: add @ts-expect-error when we have typescript support
    assert.equal(result.foo.isBar, undefined);
    assert.equal(result.bar.isFoo, undefined);
  });
});
