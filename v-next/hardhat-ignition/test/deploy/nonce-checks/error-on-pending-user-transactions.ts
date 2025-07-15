import type { TestChainHelper } from "../../test-helpers/use-ignition-project.js";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { assertRejectsWithHardhatError } from "@nomicfoundation/hardhat-test-utils";
import { buildModule } from "@nomicfoundation/ignition-core";
import { assert } from "chai";
import { createWalletClient, custom } from "viem";
import { hardhat } from "viem/chains";

import { mineBlock } from "../../test-helpers/mine-block.js";
import { useFileIgnitionProject } from "../../test-helpers/use-ignition-project.js";
import { waitForPendingTxs } from "../../test-helpers/wait-for-pending-txs.js";

/**
 * For all accounts that will be used during the deployment we check
 * to see if there are pending transactions (not from previous runs)
 * and error if there are any.
 */
describe("execution - error on pending user transactions", () => {
  useFileIgnitionProject(
    "minimal",
    "error-on-rerun-with-replaced-pending-user-transaction",
  );

  it("should error if a transaction is in flight for an account used in the deploy", async function () {
    // Setup a module with a contract deploy on accounts[2]
    const moduleDefinition = buildModule("FooModule", (m) => {
      const account2 = m.getAccount(2);

      const foo = m.contract("Foo", [], { from: account2 });

      return {
        foo,
      };
    });

    const FooArtifact = await this.hre.artifacts.readArtifact("Foo");

    // Before deploy, put a valid transaction into the mempool for accounts[2]
    const [, , signer2] = (await this.connection.provider.request({
      method: "eth_accounts",
    })) as string[];

    const walletClient = createWalletClient({
      chain: hardhat,
      transport: custom(this.connection.provider),
    });

    const deployPromise = walletClient.deployContract({
      abi: FooArtifact.abi,
      bytecode: FooArtifact.bytecode as `0x${string}`,
      args: [],
      account: signer2 as `0x${string}`,
    });

    await waitForPendingTxs(this.connection, 1, deployPromise);

    // Deploying the module that uses accounts[2] throws with a warning
    await assertRejectsWithHardhatError(
      this.runControlledDeploy(
        moduleDefinition,
        async (_c: TestChainHelper) => {},
      ),
      HardhatError.ERRORS.IGNITION.EXECUTION.WAITING_FOR_CONFIRMATIONS,
      {
        sender: "0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc",
        requiredConfirmations: 1,
      },
    );

    // Now mine the user interference transaction
    await mineBlock(this.connection);

    // The users interfering transaction completes normally
    const outsideFoo = await deployPromise;
    assert.equal(
      outsideFoo,
      "0xbe9ec293f5e7b916baa70d56af1e30667ad5512e1cfad31f454d5da09e3f5973",
    );
  });
});
