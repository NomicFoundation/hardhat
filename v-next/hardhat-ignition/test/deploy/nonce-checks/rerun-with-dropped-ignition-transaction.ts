import type { TestChainHelper } from "../../test-helpers/use-ignition-project.js";

import { buildModule } from "@nomicfoundation/ignition-core";
import { assert } from "chai";

import { clearPendingTransactionsFromMemoryPool } from "../../test-helpers/clear-pending-transactions-from-memory-pool.js";
import { mineBlock } from "../../test-helpers/mine-block.js";
import { useFileIgnitionProject } from "../../test-helpers/use-ignition-project.js";

/**
 * Run an initial deploy, that starts but does not finish an on-chain
 * transaction. The transaction is dropped from the memory pool. On rerun
 * the transaction should be resubmitted.
 */
describe("execution - rerun with dropped ignition transactions", () => {
  useFileIgnitionProject("minimal", "rerun-with-dropped-ignition-transactions");

  it("should deploy successfully on second run", async function () {
    const moduleDefinition = buildModule("FooModule", (m) => {
      const foo = m.contract("Foo", []);

      return {
        foo,
      };
    });

    // Start the deploy
    await this.runControlledDeploy(
      moduleDefinition,
      async (c: TestChainHelper) => {
        // Wait for the submission of foo to mempool
        await c.waitForPendingTxs(1);

        // kill the deployment before confirming foo
        c.exitDeploy();
      },
    );

    // remove the submitted foo deploy from mempool
    await clearPendingTransactionsFromMemoryPool(this.connection);

    // Further blocks with no pending transactions
    await mineBlock(this.connection);
    await mineBlock(this.connection);

    // Rerun the deployment
    const result = await this.runControlledDeploy(
      moduleDefinition,
      async (c: TestChainHelper) => {
        // this block should include deployment of foo via resend
        await c.mineBlock(1);
      },
    );

    assert.equal(await result.foo.read.x(), 1n);
  });
});
