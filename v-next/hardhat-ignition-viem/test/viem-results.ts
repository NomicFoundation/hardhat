import { buildModule } from "@nomicfoundation/ignition-core";
import { assert } from "chai";

import { externallyLoadedContractArtifact } from "./test-helpers/externally-loaded-contract.js";
import { useIgnitionProject } from "./test-helpers/use-ignition-project.js";

describe("viem results", () => {
  useIgnitionProject("minimal");

  it("should only return properties for the properties of the module results", async function () {
    const moduleDefinition = buildModule("Module", (m) => {
      const foo = m.contract("Foo");

      return { foo };
    });

    const result = await this.connection.ignition.deploy(moduleDefinition);

    assert.isDefined(result.foo);

    // @ts-expect-error
    assert.isUndefined(result.nonexistant);
  });

  it("should differentiate between different contracts in the type system", async function () {
    const moduleDefinition = buildModule("Module", (m) => {
      const foo = m.contract("Foo");
      const bar = m.contract("Bar");
      const baz = m.contract("Bas", externallyLoadedContractArtifact);

      return { foo, bar, baz };
    });

    const result = await this.connection.ignition.deploy(moduleDefinition);

    assert.isTrue(await result.foo.read.isFoo());
    assert.isTrue(await result.bar.read.isBar());
    assert.isTrue(await result.baz.read.isExternallyLoaded());

    // Calling the wrong method on a viem instance should throw, but more
    // importantly give a type error.

    // foo shouldn't have bar or baz methods
    await assert.isRejected(
      // @ts-expect-error - isBar is not a method on Foo
      result.foo.read.isBar(),
      /Make sure you are using the correct ABI and that the function exists on it./,
    );
    await assert.isRejected(
      // @ts-expect-error - isBar is not a method on Foo
      result.foo.read.isExternallyLoaded(),
      /Make sure you are using the correct ABI and that the function exists on it./,
    );

    // bar shouldn't have foo or baz methods
    await assert.isRejected(
      // @ts-expect-error - isFoo is not a method on Bar
      result.bar.read.isFoo(),
      /Make sure you are using the correct ABI and that the function exists on it./,
    );
    await assert.isRejected(
      // @ts-expect-error - isExternallyLoaded is not a method on Bar
      result.bar.read.isExternallyLoaded(),
      /Make sure you are using the correct ABI and that the function exists on it./,
    );

    // baz shouldn't have foo or bar methods
    await assert.isRejected(
      // @ts-expect-error - isFoo is not a method on the externally loaded contract
      result.baz.read.isFoo(),
      /Make sure you are using the correct ABI and that the function exists on it./,
    );
    await assert.isRejected(
      // @ts-expect-error - isBar is not a method on the externally loaded contract
      result.baz.read.isBar(),
      /Make sure you are using the correct ABI and that the function exists on it./,
    );
  });
});
