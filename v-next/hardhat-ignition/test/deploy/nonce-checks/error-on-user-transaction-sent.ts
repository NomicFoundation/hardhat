/* eslint-disable import/no-unused-modules */
import { buildModule } from "@ignored/hardhat-vnext-ignition-core";
import { assert } from "chai";
import { createWalletClient, custom } from "viem";
import { hardhat } from "viem/chains";

import {
  TestChainHelper,
  useFileIgnitionProject,
} from "../../test-helpers/use-ignition-project";

/**
 * On running a deploy, if a transaction is pending and the user
 * sends a new transaction outside Ignition on the same account
 * we should error and halt immediately
 */
describe("execution - error on user transaction sent", () => {
  useFileIgnitionProject("minimal", "error-on-user-transaction-sent");

  it("should error on the drop being detected", async function () {
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

    // The deploy should exception when the additional user interfering
    // transaction is detected
    await assert.isRejected(
      this.runControlledDeploy(moduleDefinition, async (c: TestChainHelper) => {
        // wait for foo1 to be submitted
        await c.waitForPendingTxs(1);

        const FooArtifact = this.hre.artifacts.readArtifactSync("Foo");

        // Submit user interference transaction to mempool (note a fresh
        // nonce is used, so no replacement)
        const [, , signer2] = (await this.hre.network.provider.request({
          method: "eth_accounts",
        })) as string[];

        const walletClient = createWalletClient({
          chain: hardhat,
          transport: custom(this.hre.network.provider),
        });

        const deployPromise = walletClient.deployContract({
          abi: FooArtifact.abi,
          bytecode: FooArtifact.bytecode as `0x${string}`,
          args: [],
          account: signer2 as `0x${string}`,
          gasPrice: 500_000_000_000n,
        });

        // Process block 1 with foo1
        await c.mineBlock(1);

        const fooAddress = await deployPromise;
        assert.equal(
          fooAddress,
          "0x9154ff20c97a7ebf9d2ebbb3f8b7e24bf99caee050a24c50f1162492c0b6af79"
        );
      }),
      "IGN405: The next nonce for 0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc should be 1, but is 2. Please make sure not to send transactions from 0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc while running this deployment and try again."
    );
  });
});
