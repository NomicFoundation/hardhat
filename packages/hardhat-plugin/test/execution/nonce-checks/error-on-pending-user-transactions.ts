/* eslint-disable import/no-unused-modules */
import { defineModule } from "@ignored/ignition-core";
import { assert } from "chai";

import { waitForPendingTxs } from "../../helpers";
import { mineBlock } from "../helpers";

import {
  TestChainHelper,
  useDeploymentDirectory,
} from "./useDeploymentDirectory";

/**
 * For all accounts that will be used during the deployment we check
 * to see if there are pending transactions (not from previous runs)
 * and error if there are any.
 */
describe("execution - error on pending user transactions", () => {
  useDeploymentDirectory(
    "minimal-new-api",
    "error-on-rerun-with-replaced-pending-user-transaction"
  );

  it("should error if a transaction is in flight for an account used in the deploy", async function () {
    // Setup a module with a contract deploy on accounts[2]
    const moduleDefinition = defineModule("FooModule", (m) => {
      const account2 = m.getAccount(2);

      const foo = m.contract("Foo", [], { from: account2 });

      return {
        foo,
      };
    });

    // Before deploy, put a valid transaction into the mempool for accounts[2]
    const [, , signer2] = await this.hre.ethers.getSigners();
    const FooFactory = await this.hre.ethers.getContractFactory("Foo");
    const outsideFooPromise = FooFactory.connect(signer2).deploy();
    await waitForPendingTxs(this.hre, 1, outsideFooPromise);

    // Deploying the module that uses accounts[2] throws with a warning
    await assert.isRejected(
      this.deploy(moduleDefinition, async (_c: TestChainHelper) => {}),
      "Pending transactions for account: 0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc, please wait for transactions to complete before running a deploy"
    );

    // Now mine the user interference transaction
    await mineBlock(this.hre);

    // The users interfering transaction completes normally
    const outsideFoo = await outsideFooPromise;
    assert.equal(await outsideFoo.x(), Number(1));
  });
});
