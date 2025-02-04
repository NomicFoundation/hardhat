/* eslint-disable import/no-unused-modules */
import { buildModule } from "@ignored/hardhat-vnext-ignition-core";
import { assert } from "chai";

import {
  TestChainHelper,
  useFileIgnitionProject,
} from "../../test-helpers/use-ignition-project.js";

/**
 * Run an initial deploy that deploys multiple contracts, one contract per batch.
 * Kill the process on the first transaction being submitted.
 * Restart the deployment and ensure that the deployment is completed with
 * all contracts deployed.
 *
 * This covers a bug in the nonce mangement code: see #576
 */
describe("execution - rerun after kill", function () {
  this.timeout(60000);

  useFileIgnitionProject("minimal", "rerun-after-kill");

  it("should pickup deployment and run contracts to completion", async function () {
    const moduleDefinition = buildModule("FooModule", (m) => {
      const foo1 = m.contract("Foo", [], { id: "foo1" });
      const foo2 = m.contract("Foo", [], { id: "foo2" });
      const foo3 = m.contract("Foo", [], { id: "foo3" });
      const foo4 = m.contract("Foo", [], { id: "foo4" });
      const foo5 = m.contract("Foo", [], { id: "foo5" });

      return {
        foo1,
        foo2,
        foo3,
        foo4,
        foo5,
      };
    });

    // Start the deploy
    await this.runControlledDeploy(
      moduleDefinition,
      async (c: TestChainHelper) => {
        // this block shound include deployment of foo1
        await c.waitForPendingTxs(1);

        c.exitDeploy();
      }
    );

    // Rerun the deployment
    const result = await this.runControlledDeploy(
      moduleDefinition,
      async (c: TestChainHelper) => {
        // this block shound include deployment of foo2
        await c.mineBlock(1);
        await c.mineBlock(1);
        await c.mineBlock(1);
        await c.mineBlock(1);
        await c.mineBlock(1);
      }
    );

    assert.equal(await result.foo1.read.x(), 1n);
    assert.equal(await result.foo2.read.x(), 1n);
    assert.equal(await result.foo3.read.x(), 1n);
    assert.equal(await result.foo4.read.x(), 1n);
    assert.equal(await result.foo5.read.x(), 1n);
  });
});
