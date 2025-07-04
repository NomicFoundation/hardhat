import type { TestChainHelper } from "../../test-helpers/use-ignition-project.js";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { assertRejectsWithHardhatError } from "@nomicfoundation/hardhat-test-utils";
import { buildModule } from "@nomicfoundation/ignition-core";
import { assert } from "chai";
import { createWalletClient, custom } from "viem";
import { hardhat } from "viem/chains";

import { useFileIgnitionProject } from "../../test-helpers/use-ignition-project.js";

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
    await assertRejectsWithHardhatError(
      this.runControlledDeploy(moduleDefinition, async (c: TestChainHelper) => {
        // wait for foo1 to be submitted
        await c.waitForPendingTxs(1);

        const FooArtifact = await this.hre.artifacts.readArtifact("Foo");

        // Submit user interference transaction to mempool (note a fresh
        // nonce is used, so no replacement)
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
          gasPrice: 500_000_000_000n,
        });

        // Process block 1 with foo1
        await c.mineBlock(1);

        const fooAddress = await deployPromise;
        assert.equal(
          fooAddress,
          "0x2827d72f957f8c222974e724765629a79689e177729fad094065ad220f35e5e7",
        );
      }),
      HardhatError.ERRORS.IGNITION.EXECUTION.INVALID_NONCE,
      {
        sender: "0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc",
        expectedNonce: 1,
        pendingCount: 2,
      },
    );
  });
});
