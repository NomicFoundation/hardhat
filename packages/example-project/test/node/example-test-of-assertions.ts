import { describe, it, before } from "node:test";
import hre from "hardhat";
import { ContractReturnType } from "@nomicfoundation/hardhat-viem/types";

const { viem } = await hre.network.connect();

describe("Example EDR based test", () => {
  describe("revert", () => {
    let failingContract: ContractReturnType<"FailingContract">;

    before(async () => {
      failingContract = await viem.deployContract("FailingContract");
    });

    it("should support checking that a transaction reverts", async () => {
      await viem.assertions.revert(failingContract.read.fail());
    });

    it("should support checking that a transaction reverts with a specific message", async () => {
      await viem.assertions.revertWith(
        failingContract.read.fail(),
        "Revert Message",
      );
    });

    it("should support checking that a transaction reverts with a custom error and specific arguments", async () => {
      await viem.assertions.revertWithCustomErrorWithArgs(
        failingContract.read.failByRevertWithCustomErrorWithUintAndString([
          10n,
          "example",
        ]),
        failingContract,
        "CustomErrorWithUintAndString",
        [10n, "example"],
      );
    });
  });

  describe("Events", () => {
    it("should support detecting an emitted event", async () => {
      const rocketContract = await viem.deployContract("Rocket", ["Apollo"]);

      await viem.assertions.emit(
        rocketContract.write.launch(),
        rocketContract,
        "LaunchWithoutArgs",
      );
    });

    it("should support detecting an emitted events arguments", async () => {
      const rocketContract = await viem.deployContract("Rocket", ["Apollo"]);

      await viem.assertions.emitWithArgs(
        rocketContract.write.launch(),
        rocketContract,
        "LaunchWithTwoStringArgs",
        ["Apollo", "lift-off"],
      );
    });
  });

  it("should support detecting a change of balance", async () => {
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
        {
          address: bobWalletClient.account.address,
          amount: -3333333333333333n,
        },
      ],
    );
  });
});
