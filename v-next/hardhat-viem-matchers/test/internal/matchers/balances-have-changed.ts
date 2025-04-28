import type { HardhatViemHelpers } from "@nomicfoundation/hardhat-viem/types";

import { beforeEach, describe, it } from "node:test";

import { assertRejects } from "@nomicfoundation/hardhat-test-utils";
import hardhatViem from "@nomicfoundation/hardhat-viem";
import { createHardhatRuntimeEnvironment } from "hardhat/hre";

import hardhatViemMatchers from "../../../src/index.js";

describe("balancesHaveChanged", () => {
  let viem: HardhatViemHelpers;

  beforeEach(async () => {
    const hre = await createHardhatRuntimeEnvironment({
      plugins: [hardhatViem, hardhatViemMatchers],
    });

    ({ viem } = await hre.network.connect());
  });

  it("should check that a single balances has changed", async () => {
    const [bobWalletClient, aliceWalletClient] = await viem.getWalletClients();

    await viem.assertions.balancesHaveChanged(async () => {
      const hash = await bobWalletClient.sendTransaction({
        to: aliceWalletClient.account.address,
        value: 1000000000000000000000n,
      });

      const publicClient = await viem.getPublicClient();
      await publicClient.waitForTransactionReceipt({ hash });
    }, [
      {
        address: aliceWalletClient.account.address,
        amount: 1000000000000000000000n,
      },
    ]);
  });

  it("should check that multiple balances have changed", async () => {
    const [bobWalletClient, aliceWalletClient] = await viem.getWalletClients();

    await viem.assertions.balancesHaveChanged(async () => {
      const hash = await bobWalletClient.sendTransaction({
        to: aliceWalletClient.account.address,
        value: 1000000000000000000000n,
      });

      const publicClient = await viem.getPublicClient();
      await publicClient.waitForTransactionReceipt({ hash });
    }, [
      {
        address: bobWalletClient.account.address,
        amount: -1000000023255859375000n, // TODO: gas fees that change the value?
      },
      {
        address: aliceWalletClient.account.address,
        amount: 1000000000000000000000n,
      },
    ]);
  });

  it("should throw an error when the balance changes to a value different from the expected one", async () => {
    const [bobWalletClient, aliceWalletClient] = await viem.getWalletClients();

    await assertRejects(
      viem.assertions.balancesHaveChanged(async () => {
        const hash = await bobWalletClient.sendTransaction({
          to: aliceWalletClient.account.address,
          value: 1000000000000000000000n,
        });

        const publicClient = await viem.getPublicClient();
        await publicClient.waitForTransactionReceipt({ hash });
      }, [
        {
          address: aliceWalletClient.account.address,
          amount: 10n,
        },
      ]),
      (error) =>
        error.message.includes(
          `For address "${aliceWalletClient.account.address}", expected balance to change by 10 (from 10000000000000000000000 to 10000000000000000000010), but got 11000000000000000000000 instead.`,
        ),
    );
  });
});
