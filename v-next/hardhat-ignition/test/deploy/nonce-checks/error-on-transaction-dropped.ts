/* eslint-disable import/no-unused-modules */
import type { TestChainHelper } from "../../test-helpers/use-ignition-project.js";

import { buildModule } from "@nomicfoundation/ignition-core";
import { assert } from "chai";

import { useFileIgnitionProject } from "../../test-helpers/use-ignition-project.js";

/**
 * On running a deploy, if a transaction is dropped from the mempool
 * before it is confirmed, then we halt and display an error.
 */
describe("execution - error on transaction dropped", () => {
  useFileIgnitionProject("minimal", "error-on-transaction-dropped");

  it("should error on the drop being detected", async function () {
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
      this.runControlledDeploy(moduleDefinition, async (c: TestChainHelper) => {
        // Process block 1 confirming foo1
        await c.mineBlock(1);

        // Wait for foo2 to be pending, then wipe it from memory pool
        await c.clearMempool(1);

        // Mine further block allowing foo2 to be checked again
        await c.mineBlock();
      }),
      "IGN401: Error while executing FooModule#Foo2: all the transactions of its network interaction 1 were dropped. Please try rerunning Hardhat Ignition.",
    );
  });
});
