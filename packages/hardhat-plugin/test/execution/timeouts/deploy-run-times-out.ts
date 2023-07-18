/* eslint-disable import/no-unused-modules */
import { defineModule } from "@ignored/ignition-core";
import { assert } from "chai";

import {
  TestChainHelper,
  useFileIgnitionProject,
} from "../../use-ignition-project";

/**
 * A run that deploys a contract times out
 */
describe("execution - deploy run times out", () => {
  useFileIgnitionProject("minimal-new-api", "deploy-run-times-out", {
    transactionTimeoutInterval: 400,
  });

  it("should error naming timed out transactions", async function () {
    // Setup a module with a contract deploy on accounts[2]
    const moduleDefinition = defineModule("FooModule", (m) => {
      const account2 = m.getAccount(2);

      const foo = m.contract("Foo", [], { from: account2 });

      return {
        foo,
      };
    });

    // Deploying the module that uses accounts[2] throws with a warning
    await assert.isRejected(
      this.deploy(moduleDefinition, async (c: TestChainHelper) => {
        // wait for the deploy transaction to hit the memory pool,
        // but then never mine the block that will complete it.
        await c.waitForPendingTxs(1);
      }),
      "The deployment has been halted due to transaction timeouts:\n  0xc5ed278cdc282e8cf6ffa96234e680592c22a2c0afbdac114616ea02b132091b (FooModule:Foo/1)"
    );
  });
});
