import type { HardhatViemHelpers } from "@nomicfoundation/hardhat-viem/types";
import type { HardhatRuntimeEnvironment } from "hardhat/types/hre";

import { before, beforeEach, describe, it } from "node:test";

import {
  assertRejects,
  useEphemeralFixtureProject,
} from "@nomicfoundation/hardhat-test-utils";
import hardhatViem from "@nomicfoundation/hardhat-viem";
import { createHardhatRuntimeEnvironment } from "hardhat/hre";

import hardhatViemAssertions from "../../../src/index.js";
import { isExpectedError } from "../../helpers/is-expected-error.js";

describe("balancesHaveChanged", () => {
  let viem: HardhatViemHelpers;

  beforeEach(async () => {
    const hre = await createHardhatRuntimeEnvironment({
      plugins: [hardhatViem, hardhatViemAssertions],
    });

    ({ viem } = await hre.network.create());
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

  it("should accept an already-awaited tx hash", async () => {
    const [bobWalletClient, aliceWalletClient] = await viem.getWalletClients();

    const txHash = await bobWalletClient.sendTransaction({
      to: aliceWalletClient.account.address,
      value: 3333333333333333n,
    });

    await viem.assertions.balancesHaveChanged(txHash, [
      {
        address: aliceWalletClient.account.address,
        amount: 3333333333333333n,
      },
    ]);
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

describe("balancesHaveChanged with contract write calls", () => {
  let hre: HardhatRuntimeEnvironment;
  let viem: HardhatViemHelpers;

  useEphemeralFixtureProject("hardhat-project");

  before(async () => {
    hre = await createHardhatRuntimeEnvironment({
      solidity: "0.8.24",
      plugins: [hardhatViem, hardhatViemAssertions],
    });

    await hre.tasks.getTask("build").run({});
  });

  beforeEach(async () => {
    ({ viem } = await hre.network.create());
  });

  it("should check balance changes when passed a contract write call promise", async () => {
    const counter = await viem.deployContract("Counter");
    const [bobWalletClient] = await viem.getWalletClients();

    await viem.assertions.balancesHaveChanged(
      counter.write.deposit([], { value: 1000n }),
      [
        { address: counter.address, amount: 1000n },
        { address: bobWalletClient.account.address, amount: -1000n },
      ],
    );
  });

  it("should check balance changes when passed an already-awaited contract write call", async () => {
    const counter = await viem.deployContract("Counter");
    const [bobWalletClient] = await viem.getWalletClients();

    const txHash = await counter.write.deposit([], { value: 1000n });

    await viem.assertions.balancesHaveChanged(txHash, [
      { address: counter.address, amount: 1000n },
      { address: bobWalletClient.account.address, amount: -1000n },
    ]);
  });
});
