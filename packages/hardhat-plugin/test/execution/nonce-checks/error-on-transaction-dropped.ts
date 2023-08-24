/* eslint-disable import/no-unused-modules */
import { buildModule } from "@ignored/ignition-core";
import { assert } from "chai";

import {
  TestChainHelper,
  useFileIgnitionProject,
} from "../../use-ignition-project";

/**
 * On running a deploy, if a transaction is dropped from the mempool
 * before it is confirmed, then we halt and display an error.
 */
describe("execution - error on transaction dropped", () => {
  useFileIgnitionProject("minimal-new-api", "error-on-transaction-dropped");

  it.skip("should error on the drop being detected", async function () {
    // Setup a module with two contract deploys (foo1 and foo2) over 2 batches
    const moduleDefinition = buildModule("FooModule", (m) => {
      const account2 = m.getAccount(2);

      // batch 1
      const foo1 = m.contract("Foo", [], { id: "Foo1", from: account2 });

      // batch 2
      const foo2 = m.contract("Foo", [], {
        id: "Foo2",
        from: account2,
        after: [foo1],
      });

      return {
        foo1,
        foo2,
      };
    });

    // The deploy should exception once the dropped transaction for foo2
    // is detected

    await assert.isRejected(
      this.deploy(moduleDefinition, async (c: TestChainHelper) => {
        // Process block 1 confirming foo1
        await c.mineBlock(1);

        // Wait for foo2 to be pending, then wipe it from memory pool
        await c.clearMempool(1);

        // Mine further block allowing foo2 to be checked again
        await c.mineBlock();
      }),
      "Transaction 0x94508af7099a6684f0a431cabd18015ee38ebf0992daa12bfb8830fae96cd93a (FooModule:Foo2/1) has dropped from mempool"
    );
  });
});
