/* eslint-disable import/no-unused-modules */
import { buildModule } from "@ignored/ignition-core";
import { assert } from "chai";

import {
  TestChainHelper,
  useFileIgnitionProject,
} from "../../use-ignition-project";

/**
 * Run an initial deploy, that starts but does not finish several on-chain
 * transactions via Ignition. The user then replaces a transaction by
 * reusing a nonce with a higher gas value. On the rerun we should
 * error that there is a pending non-ignition transaction.
 */
describe("execution - error on rerun with replaced pending user transaction", () => {
  useFileIgnitionProject(
    "minimal-new-api",
    "error-on-rerun-with-replaced-pending-user-transaction"
  );

  it("should error on the second run", async function () {
    const moduleDefinition = buildModule("FooModule", (m) => {
      const account2 = m.getAccount(2);

      // batch 1
      const foo1 = m.contract("Foo", [], { id: "Foo1", from: account2 });
      const foo2 = m.contract("Foo", [], { id: "Foo2", from: account2 });
      const foo3 = m.contract("Foo", [], { id: "Foo3", from: account2 });

      return {
        foo1,
        foo2,
        foo3,
      };
    });

    // Start the deployment, but exit before processing a block,
    // so transactions are in memory pool but not confirmed
    await this.deploy(
      moduleDefinition,

      async (c: TestChainHelper) => {
        // Wait for the submission of foo1 foo2 and foo3 to mempool
        await c.waitForPendingTxs(3);

        // Then kill before any blocks
        c.exitDeploy();
      }
    );

    // Send user interefering deploy transaction, between runs
    // so it is in mempool, overriding the existing nonce 2
    // transaction
    const [, , signer2] = await this.hre.ethers.getSigners();
    const FooFactory = await this.hre.ethers.getContractFactory("Foo");
    FooFactory.connect(signer2).deploy({
      gasPrice: this.hre.ethers.utils.parseUnits("500", "gwei"),
      nonce: 2, // same nonce as foo3
    });

    // On the second run, we should detect the user interference
    // and error
    await assert.isRejected(
      this.deploy(moduleDefinition),
      "Pending transaction from user"
    );
  });
});
