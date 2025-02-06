/* eslint-disable import/no-unused-modules */
import type { TestChainHelper } from "../../test-helpers/use-ignition-project.js";

import { buildModule } from "@ignored/hardhat-vnext-ignition-core";
import { assert } from "chai";

import { useFileIgnitionProject } from "../../test-helpers/use-ignition-project.js";

/**
 * Run an initial deploy, that starts but does not finish several on-chain
 * transactions via Ignition. Perform another run picking the deployment
 * up where the first run left off and without any other user transactions.
 */
// TODO: Bring back with Hardhat 3 fixtures
describe.skip("execution - rerun with pending ignition transactions", () => {
  useFileIgnitionProject("minimal", "rerun-with-pending-ignition-transactions");

  it("should complete the run on the second attempt", async function () {
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

        // Kill the deployment, with foo3 and foo4 submitted to mempool
        await c.waitForPendingTxs(2);
        c.exitDeploy();
      },
    );

    // NOTE: no blocks mined between previous run and this run
    // there should two deploy contract transactions for foo3 and foo4
    // in the mempool
    const result = await this.runControlledDeploy(
      moduleDefinition,
      async (c: TestChainHelper) => {
        // this block should confirm foo3 and foo4
        await c.mineBlock(2);

        // this block shound include foo5 and foo6
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
