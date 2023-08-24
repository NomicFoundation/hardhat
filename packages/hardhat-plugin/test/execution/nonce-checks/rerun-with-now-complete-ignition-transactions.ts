/* eslint-disable import/no-unused-modules */
import { buildModule } from "@ignored/ignition-core";
import { assert } from "chai";

import {
  TestChainHelper,
  useFileIgnitionProject,
} from "../../use-ignition-project";
import { mineBlock } from "../helpers";

/**
 * Run an initial deploy, that sumbit but does not confirm several on-chain
 * transactions via Ignition. Those ignition transactions now confirm before
 * a second run completes the deploy.
 */
describe("execution - rerun with now complete ignition transactions", () => {
  useFileIgnitionProject(
    "minimal-new-api",
    "rerun-with-now-complete-ignition-transactions"
  );

  it.skip("should complete the run on the second attempt", async function () {
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

    await this.deploy(moduleDefinition, async (c: TestChainHelper) => {
      // Process the first block, include foo1 and foo2
      await c.mineBlock(2);

      // Kill the deployment, after foo3 and foo4 are submitted to mempool
      await c.waitForPendingTxs(2);
      c.exitDeploy();
    });

    // Further blocks are processed confirming foo3 and foo4
    await mineBlock(this.hre);
    await mineBlock(this.hre);

    // Rerun the deployment, with foo3 and foo3 now confirmed
    const result = await this.deploy(
      moduleDefinition,
      async (c: TestChainHelper) => {
        await c.mineBlock(2);
      }
    );

    assert.isDefined(result);

    const x1 = await result.foo1.x();
    const x2 = await result.foo2.x();
    const x3 = await result.foo3.x();
    const x4 = await result.foo4.x();
    const x5 = await result.foo5.x();
    const x6 = await result.foo6.x();

    assert.equal(x1, Number(1));
    assert.equal(x2, Number(1));
    assert.equal(x3, Number(1));
    assert.equal(x4, Number(1));
    assert.equal(x5, Number(1));
    assert.equal(x6, Number(1));
  });
});
