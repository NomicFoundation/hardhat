/* eslint-disable import/no-unused-modules */
import { setNextBlockBaseFeePerGas } from "@nomicfoundation/hardhat-network-helpers";
import { buildModule, wipe } from "@nomicfoundation/ignition-core";
import { assert } from "chai";

import { HardhatArtifactResolver } from "../../../src/hardhat-artifact-resolver";
import { mineBlock } from "../../test-helpers/mine-block";
import {
  TestChainHelper,
  useFileIgnitionProject,
} from "../../test-helpers/use-ignition-project";

/**
 * A run that deploys a contract times out
 *
 * TODO: Needs to be updated to deal with fee bumps
 */
describe("execution - rerun a deploy that timed out", () => {
  useFileIgnitionProject("minimal", "rerun-a-deploy-that-timed-out", {
    blockPollingInterval: 50,
    timeBeforeBumpingFees: 45,
    maxFeeBumps: 2,
    requiredConfirmations: 1,
  });

  it("shows an error indicating a wipe is required", async function () {
    // Setup a module with a contract deploy on accounts[2]
    const moduleDefinition = buildModule("FooModule", (m) => {
      const account2 = m.getAccount(2);

      const foo = m.contract("Foo", [], { from: account2 });

      return {
        foo,
      };
    });

    // Deploying the module that uses accounts[2], but force timeout,
    // by not processing any blocks
    await assert.isRejected(
      this.runControlledDeploy(moduleDefinition, async (c: TestChainHelper) => {
        // wait for the deploy transaction to hit the memory pool,
        // but then never mine the block that will complete it.
        await c.waitForPendingTxs(1);
        await setNextBlockBaseFeePerGas(10_000_000_000n);
        await c.mineBlock();

        await c.waitForPendingTxs(1);
        await setNextBlockBaseFeePerGas(100_000_000_000n);
        await c.mineBlock();

        await c.waitForPendingTxs(1);
        await setNextBlockBaseFeePerGas(1_000_000_000_000n);
        await c.mineBlock();
      })
    );

    await assert.isRejected(
      this.runControlledDeploy(moduleDefinition, async (c: TestChainHelper) => {
        // Mine the block, confirming foo
        await c.mineBlock(1);
      }),
      `The deployment wasn\'t run because of the following errors in a previous run:

  * FooModule#Foo: The previous run of the future FooModule#Foo timed out, and will need wiped before running again`
    );
  });

  /**
   * Perform a run that times out by manipulating the base fee. Reset the base fee
   * and wipe the future, the run again.
   *
   * A new second transaction is submitted that succeeds.
   */
  it("should successfully rerun after a timeout (and a wipe)", async function () {
    // Setup a module with a contract deploy on accounts[2]
    const moduleDefinition = buildModule("FooModule", (m) => {
      const account2 = m.getAccount(2);

      const foo = m.contract("Foo", [], { from: account2 });

      return {
        foo,
      };
    });

    // Deploying the module that uses accounts[2], but force timeout,
    // by not processing any blocks
    await assert.isRejected(
      this.runControlledDeploy(moduleDefinition, async (c: TestChainHelper) => {
        // wait for the deploy transaction to hit the memory pool,
        // but then never mine the block that will complete it.
        await c.waitForPendingTxs(1);
        await setNextBlockBaseFeePerGas(10_000_000_000n);
        await c.mineBlock();

        await c.waitForPendingTxs(1);
        await setNextBlockBaseFeePerGas(100_000_000_000n);
        await c.mineBlock();

        await c.waitForPendingTxs(1);
        await setNextBlockBaseFeePerGas(1_000_000_000_000n);
        await c.mineBlock();
      })
    );

    await setNextBlockBaseFeePerGas(1_000_000n);
    await mineBlock(this.hre);

    await wipe(
      this.deploymentDir!,
      new HardhatArtifactResolver(this.hre),
      "FooModule#Foo"
    );

    const result = await this.runControlledDeploy(
      moduleDefinition,
      async (c: TestChainHelper) => {
        // Mine the block, confirming foo
        await c.mineBlock(1);
      }
    );

    assert.isDefined(result);
    assert.equal(await result.foo.read.x(), 1n);
  });
});
