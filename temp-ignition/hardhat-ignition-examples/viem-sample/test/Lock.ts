import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import hre from "hardhat";

import LockModule from "../ignition/modules/LockModule";

describe("Lock", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployOneYearLockFixture() {
    const ONE_YEAR_IN_SECS = 365 * 24 * 60 * 60;
    const ONE_GWEI = 1_000_000_000;

    const lockedAmount = BigInt(ONE_GWEI);
    const unlockTime = BigInt((await time.latest()) + ONE_YEAR_IN_SECS);

    // Contracts are deployed using the first signer/account by default
    const [owner, otherAccount] = await hre.viem.getWalletClients();

    const { lock } = await hre.ignition.deploy(LockModule, {
      parameters: {
        LockModule: {
          unlockTime,
          lockedAmount,
        },
      },
    });

    return { lock, unlockTime, lockedAmount, owner, otherAccount };
  }

  describe("Deployment", function () {
    it("Should set the right unlockTime", async function () {
      const { lock, unlockTime } = await loadFixture(deployOneYearLockFixture);

      expect(await lock.read.unlockTime()).to.equal(unlockTime);
    });

    it("Should set the right owner", async function () {
      const { lock, owner } = await loadFixture(deployOneYearLockFixture);

      expect((await lock.read.owner()).toLowerCase()).to.equal(
        owner.account.address
      );
    });

    it("Should receive and store the funds to lock", async function () {
      const { lock, lockedAmount } = await loadFixture(
        deployOneYearLockFixture
      );

      const client = await hre.viem.getPublicClient();

      expect(await client.getBalance({ address: lock.address })).to.equal(
        lockedAmount
      );
    });

    it("Should fail if the unlockTime is not in the future", async function () {
      // We don't use the fixture here because we want a different deployment
      const LockArtifact = require("../artifacts/contracts/Lock.sol/Lock.json");
      const latestTime = await time.latest();

      const [client] = await hre.viem.getWalletClients();

      await expect(
        client.deployContract({
          abi: LockArtifact.abi,
          bytecode: LockArtifact.bytecode,
          args: [latestTime],
          value: 1n,
          account: client.account.address,
        })
      ).to.be.rejectedWith("Unlock time should be in the future");
    });
  });

  describe("Withdrawals", function () {
    describe("Validations", function () {
      it("Should revert with the right error if called too soon", async function () {
        const { lock } = await loadFixture(deployOneYearLockFixture);

        await expect(lock.write.withdraw()).to.be.rejectedWith(
          "You can't withdraw yet"
        );
      });

      it("Should revert with the right error if called from another account", async function () {
        const { lock, unlockTime, otherAccount } = await loadFixture(
          deployOneYearLockFixture
        );

        // We can increase the time in Hardhat Network
        await time.increaseTo(unlockTime);

        await expect(
          lock.write.withdraw({ account: otherAccount.account.address })
        ).to.be.rejectedWith("You aren't the owner");
      });

      it("Shouldn't fail if the unlockTime has arrived and the owner calls it", async function () {
        const { lock, unlockTime } = await loadFixture(
          deployOneYearLockFixture
        );

        // Transactions are sent using the first signer by default
        await time.increaseTo(unlockTime);

        await expect(lock.write.withdraw()).not.to.be.rejected;
      });
    });

    describe("Events", function () {
      it("Should emit an event on withdrawals", async function () {
        const LockArtifact = hre.artifacts.readArtifactSync("Lock");
        const { lock, unlockTime, lockedAmount } = await loadFixture(
          deployOneYearLockFixture
        );

        await time.increaseTo(unlockTime);

        const client = await hre.viem.getPublicClient();

        await lock.write.withdraw();

        const logs = await client.getContractEvents({
          address: lock.address,
          abi: LockArtifact.abi,
          eventName: "Withdrawal",
        });

        expect(logs[0].args.amount).to.equal(lockedAmount);
      });
    });

    describe("Transfers", function () {
      it("Should transfer the funds to the owner", async function () {
        const { lock, unlockTime, lockedAmount } = await loadFixture(
          deployOneYearLockFixture
        );

        await time.increaseTo(unlockTime);

        const client = await hre.viem.getPublicClient();

        const lockBalanceBefore = await client.getBalance({
          address: lock.address,
        });

        await lock.write.withdraw();

        const lockBalanceAfter = await client.getBalance({
          address: lock.address,
        });

        expect(lockBalanceAfter).to.equal(lockBalanceBefore - lockedAmount);
      });
    });
  });
});
