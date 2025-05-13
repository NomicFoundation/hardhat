import type { HardhatViemHelpers } from "@nomicfoundation/hardhat-viem/types";
import type { EthereumProvider } from "hardhat/types/providers";

import { beforeEach, describe, it } from "node:test";

import { assertRejects } from "@nomicfoundation/hardhat-test-utils";
import hardhatViem from "@nomicfoundation/hardhat-viem";
import { createHardhatRuntimeEnvironment } from "hardhat/hre";

import hardhatViemMatchers from "../../../src/index.js";
import { getErrMsgWithoutColors } from "../../helpers/err-msg-without-colors.js";

describe("balancesHaveChanged", () => {
  let viem: HardhatViemHelpers;
  let provider: EthereumProvider;

  beforeEach(async () => {
    const hre = await createHardhatRuntimeEnvironment({
      plugins: [hardhatViem, hardhatViemMatchers],
    });

    ({ viem, provider } = await hre.network.connect());

    // There is a bug in Viem where block 0 does not function properly. To avoid this issue, start from a non-zero block
    await provider.request({
      method: "hardhat_mine",
    });
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
        getErrMsgWithoutColors(error.message) ===
        `For address "${aliceWalletClient.account.address}", expected balance to change by 10 (from 10000000000000000000000 to 10000000000000000000010), but got a change of 3333333333333333 instead.
+ actual - expected

+ 3333333333333333n
- 10n
`,
    );
  });
});
