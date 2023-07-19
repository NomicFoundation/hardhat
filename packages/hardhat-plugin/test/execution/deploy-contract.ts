/* eslint-disable import/no-unused-modules */
import { defineModule } from "@ignored/ignition-core";
import { assert } from "chai";

import {
  TestChainHelper,
  useEphemeralIgnitionProject,
} from "../use-ignition-project";

/**
 * This is the simplest contract deploy case.
 *
 * Deploy a single contract with non-problematic network
 */
describe("execution - deploy contract", function () {
  // TODO: rename back to minimal api once execution switched over
  useEphemeralIgnitionProject("minimal-new-api");

  it("should deploy a contract that is callable", async function () {
    const moduleDefinition = defineModule("FooModule", (m) => {
      const foo = m.contract("Foo");

      return { foo };
    });

    const result = await this.deploy(
      moduleDefinition,
      async (c: TestChainHelper) => {
        await c.mineBlock(1);
      }
    );

    assert.equal(await result.foo.x(), Number(1));
  });
});
