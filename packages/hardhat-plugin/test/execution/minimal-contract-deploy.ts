/* eslint-disable import/no-unused-modules */
import { defineModule } from "@ignored/ignition-core";
import { assert } from "chai";

import { useEnvironment } from "../useEnvironment";

/**
 * This is the simplest contract deploy case.
 *
 * Deploy a single contract with non-problematic network
 */
describe("execution - minimal contract deploy", () => {
  // TODO: rename back to minimal api once execution switched over
  useEnvironment("minimal-new-api");

  it.skip("should create a plan", async function () {
    await this.hre.network.provider.request({
      method: "evm_setAutomine",
      params: [false],
    });

    const moduleDefinition = defineModule("FooModule", (m) => {
      const foo = m.contract("Foo");

      return { foo };
    });

    const result = await this.hre.ignition2.deploy(moduleDefinition, {
      parameters: {},
    });

    assert.isDefined(result);

    await this.hre.network.provider.send("evm_mine");

    const x = await result.foo.x();

    assert.equal(x, Number(1));
  });
});
