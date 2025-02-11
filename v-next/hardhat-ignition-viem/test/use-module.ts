/* eslint-disable import/no-unused-modules */
import { buildModule } from "@ignored/hardhat-vnext-ignition-core";
import { assert } from "chai";

import { useIgnitionProject } from "./test-helpers/use-ignition-project";

describe("viem results should work across useModule boundaries", () => {
  useIgnitionProject("minimal");

  it("should only return properties for the properties of the module results", async function () {
    const submoduleDefinition = buildModule("Submodule", (m) => {
      const foo = m.contract("Foo");

      return { foo };
    });

    const moduleDefinition = buildModule("Module", (m) => {
      const { foo } = m.useModule(submoduleDefinition);

      return { foo };
    });

    const result = await this.hre.ignition.deploy(moduleDefinition);

    assert.equal(await result.foo.read.x(), 1n);

    await result.foo.write.inc();
    await result.foo.write.inc();

    assert.equal(await result.foo.read.x(), 3n);
  });
});
