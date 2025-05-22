import type { HardhatViemHelpers } from "@nomicfoundation/hardhat-viem/types";

import { beforeEach, describe, it } from "node:test";

import { assertRejects } from "@nomicfoundation/hardhat-test-utils";
import hardhatViem from "@nomicfoundation/hardhat-viem";
import { createHardhatRuntimeEnvironment } from "hardhat/hre";

import hardhatViemMatchers from "../../../src/index.js";
import { isExpectedError } from "../../helpers/is-expected-error.js";

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

    await viem.assertions.balancesHaveChanged(
      bobWalletClient.sendTransaction({
        to: aliceWalletClient.account.address,
        value: 3333333333333333n,
      }),
      [
        {
          address: aliceWalletClient.account.address,
          amount: 3333333333333333n,
        },
      ],
    );
  });

  it("should check that multiple balances have changed", async () => {
    const [bobWalletClient, aliceWalletClient] = await viem.getWalletClients();

    await viem.assertions.balancesHaveChanged(
      bobWalletClient.sendTransaction({
        to: aliceWalletClient.account.address,
        value: 3333333333333333n,
      }),
      [
        {
          address: bobWalletClient.account.address,
          amount: -3333333333333333n,
        },
        {
          address: aliceWalletClient.account.address,
          amount: 3333333333333333n,
        },
      ],
    );
  });

  it("should throw an error when the balance changes to a value different from the expected one", async () => {
    const [bobWalletClient, aliceWalletClient] = await viem.getWalletClients();

    await assertRejects(
      viem.assertions.balancesHaveChanged(
        bobWalletClient.sendTransaction({
          to: aliceWalletClient.account.address,
          value: 3333333333333333n,
        }),
        [
          {
            address: aliceWalletClient.account.address,
            amount: 10n,
          },
        ],
      ),

      (error) =>
        isExpectedError(
          error,
          `For address "${aliceWalletClient.account.address}", expected balance to change by 10 (from 10000000000000000000000 to 10000000000000000000010), but got a change of 3333333333333333 instead.`,
          3333333333333333n,
          10n,
        ),
    );
  });
});
