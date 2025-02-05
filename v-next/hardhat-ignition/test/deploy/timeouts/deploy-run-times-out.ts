/* eslint-disable import/no-unused-modules */
import { setNextBlockBaseFeePerGas } from "@nomicfoundation/hardhat-network-helpers";
import { buildModule } from "@ignored/hardhat-vnext-ignition-core";
import { assert } from "chai";

import {
  TestChainHelper,
  useFileIgnitionProject,
} from "../../test-helpers/use-ignition-project.js";

/**
 * A run that deploys a contract times out
 */
describe("execution - deploy run times out", () => {
  useFileIgnitionProject("minimal", "deploy-run-times-out", {
    blockPollingInterval: 50,
    timeBeforeBumpingFees: 45,
    maxFeeBumps: 2,
    requiredConfirmations: 1,
  });

  it("should error naming timed out transactions", async function () {
    // Setup a module with a contract deploy on accounts[2]
    const moduleDefinition = buildModule("FooModule", (m) => {
      const account2 = m.getAccount(2);

      const foo = m.contract("Foo", [], { from: account2 });

      return {
        foo,
      };
    });

    // Deploying the module that uses accounts[2] throws with a warning
    await assert.isRejected(
      this.runControlledDeploy(moduleDefinition, async (c: TestChainHelper) => {
        // wait for the deploy transaction to hit the memory pool,
        // but then bump the base fee so that it doesn't get mined,
        // with the next block
        await c.waitForPendingTxs(1);
        await setNextBlockBaseFeePerGas(10_000_000_000n);
        await c.mineBlock();

        await c.waitForPendingTxs(1);
        await setNextBlockBaseFeePerGas(100_000_000_000n);
        await c.mineBlock();

        await c.waitForPendingTxs(1);
        await setNextBlockBaseFeePerGas(1_000_000_000_000n);
        await c.mineBlock();
      }),
      "The deployment wasn't successful, there were timeouts:\n\nTimed out:\n\n  * FooModule#Foo/1",
    );
  });
});
