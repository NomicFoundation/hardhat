/* eslint-disable import/no-unused-modules */
import { buildModule } from "@ignored/ignition-core";
import { assert } from "chai";

import { waitForPendingTxs } from "../helpers";
import { useEphemeralIgnitionProject } from "../use-ignition-project";

import { mineBlock } from "./helpers";

/**
 * This is the simplest contract deploy case.
 *
 * Deploy a single contract with non-problematic network
 */
describe("execution - deploy contract", function () {
  // TODO: rename back to minimal api once execution switched over
  useEphemeralIgnitionProject("minimal-new-api");

  it("should deploy a contract that is callable", async function () {
    const moduleDefinition = buildModule("FooModule", (m) => {
      const foo = m.contract("Foo");

      return { foo };
    });

    const deployPromise = this.deploy(moduleDefinition);

    await waitForPendingTxs(this.hre, 1, deployPromise);
    await mineBlock(this.hre);

    const result = await deployPromise;

    assert.equal(await result.foo.x(), Number(1));
  });
});
