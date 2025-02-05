/* eslint-disable import/no-unused-modules */
import type { TestChainHelper } from "../../test-helpers/use-ignition-project.js";

import { buildModule } from "@ignored/hardhat-vnext-ignition-core";
import { assert } from "chai";

import { mineBlock } from "../../test-helpers/mine-block.js";
import { useFileIgnitionProject } from "../../test-helpers/use-ignition-project.js";

/**
 * Run an initial deploy, that sumbit but does not confirm several on-chain
 * transactions via Ignition. Those ignition transactions now confirm before
 * a second run completes the deploy.
 */
describe("execution - rerun with now complete ignition transactions", () => {
  useFileIgnitionProject(
    "minimal",
    "rerun-with-now-complete-ignition-transactions",
  );

  it("should complete the run on the second attempt", async function () {
    // Setup a module with 6 foo contracts deployed in pairs of 2 over 3 batches
    const moduleDefinition = buildModule("FooModule", (m) => {
      const account2 = m.getAccount(2);

      // batch 1
      const foo1 = m.contract("Foo", [], { id: "Foo1", from: account2 });
      const foo2 = m.contract("Foo", [], { id: "Foo2", from: account2 });

      // batch 2
      const foo3 = m.contract("Foo", [], {
        id: "Foo3",
        from: account2,
        after: [foo1],
      });
      const foo4 = m.contract("Foo", [], {
        id: "Foo4",
        from: account2,
        after: [foo2],
      });

      // batch 3
      const foo5 = m.contract("Foo", [], {
        id: "Foo5",
        from: account2,
        after: [foo3],
      });
      const foo6 = m.contract("Foo", [], {
        id: "Foo6",
        from: account2,
        after: [foo4],
      });

      return {
        foo1,
        foo2,
        foo3,
        foo4,
        foo5,
        foo6,
      };
    });

    await this.runControlledDeploy(
      moduleDefinition,
      async (c: TestChainHelper) => {
        // Process the first block, include foo1 and foo2
        await c.mineBlock(2);

        // Kill the deployment, after foo3 and foo4 are submitted to mempool
        await c.waitForPendingTxs(2);
        c.exitDeploy();
      },
    );

    // Further blocks are processed confirming foo3 and foo4
    await mineBlock(this.hre);
    await mineBlock(this.hre);

    // Rerun the deployment, with foo3 and foo3 now confirmed
    const result = await this.runControlledDeploy(
      moduleDefinition,
      async (c: TestChainHelper) => {
        await c.mineBlock(2);
      },
    );

    assert.isDefined(result);

    const x1 = await result.foo1.read.x();
    const x2 = await result.foo2.read.x();
    const x3 = await result.foo3.read.x();
    const x4 = await result.foo4.read.x();
    const x5 = await result.foo5.read.x();
    const x6 = await result.foo6.read.x();

    assert.equal(x1, 1n);
    assert.equal(x2, 1n);
    assert.equal(x3, 1n);
    assert.equal(x4, 1n);
    assert.equal(x5, 1n);
    assert.equal(x6, 1n);
  });
});
