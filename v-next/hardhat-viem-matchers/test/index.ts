import { describe, it } from "node:test";

import HardhatViem from "@nomicfoundation/hardhat-viem";
import { createHardhatRuntimeEnvironment } from "hardhat/hre";

import { viemExpect } from "../src/index-alternative-2.js";
import hardhatPlugin from "../src/index.js";

describe("changeEtherBalance", () => {
  it("alternative-1: viemMatchers.expect", async () => {
    const hre = await createHardhatRuntimeEnvironment({
      plugins: [HardhatViem, hardhatPlugin],
    });

    const { viem, viemMatchers } = await hre.network.connect();

    const [bobWalletClient, aliceWalletClient] = await viem.getWalletClients();

    await viemMatchers
      .expect(async () => {
        const hash = await bobWalletClient.sendTransaction({
          to: aliceWalletClient.account.address,
          value: 1000000000000000000000n,
        });

        const publicClient = await viem.getPublicClient();
        await publicClient.waitForTransactionReceipt({ hash });
      })
      .to.changeEtherBalance(
        aliceWalletClient.account.address,
        1000000000000000000000n,
      );
  });

  it("alternative-2: viem.assertions", async () => {
    const hre = await createHardhatRuntimeEnvironment({
      plugins: [HardhatViem, hardhatPlugin],
    });

    const { viem } = await hre.network.connect();

    const [bobWalletClient, aliceWalletClient] = await viem.getWalletClients();

    await viem.assertions
      .expect(async () => {
        const hash = await bobWalletClient.sendTransaction({
          to: aliceWalletClient.account.address,
          value: 1000000000000000000000n,
        });

        const publicClient = await viem.getPublicClient();
        await publicClient.waitForTransactionReceipt({ hash });
      })
      .to.changeEtherBalance(
        aliceWalletClient.account.address,
        1000000000000000000000n,
      );
  });

  it("alternative-3: viemExpect as standalone imported function", async () => {
    const hre = await createHardhatRuntimeEnvironment({
      plugins: [HardhatViem],
    });

    const { viem } = await hre.network.connect();

    const [bobWalletClient, aliceWalletClient] = await viem.getWalletClients();

    await viemExpect(async () => {
      const hash = await bobWalletClient.sendTransaction({
        to: aliceWalletClient.account.address,
        value: 1000000000000000000000n,
      });

      const publicClient = await viem.getPublicClient();
      await publicClient.waitForTransactionReceipt({ hash });
    }).to.changeEtherBalance(
      viem,
      aliceWalletClient.account.address,
      1000000000000000000000n,
    );
  });
});
