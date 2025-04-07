import { describe, it } from "node:test";

import HardhatViem from "@nomicfoundation/hardhat-viem";
import { createHardhatRuntimeEnvironment } from "hardhat/hre";

import hardhatPlugin from "../src/index.js";

describe("changeEtherBalance", () => {
  it("should change the balance of an address", async () => {
    const hre = await createHardhatRuntimeEnvironment({
      plugins: [HardhatViem, hardhatPlugin],
    });

    const { viem, viemMatchers } = await hre.network.connect();

    const [bobWalletClient, aliceWalletClient] = await viem.getWalletClients();

    const publicClient = await viem.getPublicClient();

    await viemMatchers
      .expect(async () => {
        console.log("run f");

        const hash = await bobWalletClient.sendTransaction({
          to: aliceWalletClient.account.address,
          value: 1000000000000000000000n,
        });

        await publicClient.waitForTransactionReceipt({ hash });
      })
      .to.changeEtherBalance(
        aliceWalletClient.account.address,
        1000000000000000000000n,
      );
  });
});
