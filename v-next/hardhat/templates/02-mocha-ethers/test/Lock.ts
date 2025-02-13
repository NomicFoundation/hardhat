import { network } from "@ignored/hardhat-vnext";
import { expect } from "chai";

// We haven't ported `hardhat-chai-matchers` yet, so we use a simple `chai`
// setup script, and `expect` without any Ethereum-specific functionality.

import { HardhatEthers } from "@ignored/hardhat-vnext-ethers/types";
import { NetworkHelpers } from "@ignored/hardhat-vnext-network-helpers/types";
import { EthereumProvider } from "../../../dist/src/types/providers.js";

describe("Lock", function () {
  /*
   * In Hardhat 3, there isn't a single global connection to a network. Instead,
   * you have a `network` object that allows you to connect to different
   * networks.
   *
   * You can create multiple network connections using `network.connect`.
   * It takes two optional parameters and returns a `NetworkConnection` object.
   *
   * For a better understanding of how this works, and the new features it
   * brings, we recommend taking a look at the other example project, which
   * uses `node:test` and `viem`.
   */
  let networkHelpers: NetworkHelpers;
  let ethers: HardhatEthers;
  let provider: EthereumProvider;

  before(async function () {
    const connection = await network.connect();
    ethers = connection.ethers;
    provider = connection.provider;
    networkHelpers = connection.networkHelpers;
  });

  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  const ONE_YEAR_IN_SECS = 365 * 24 * 60 * 60;
  const ONE_GWEI = 1_000_000_000;

  async function deployOneYearLockFixture() {
    const lockedAmount = ONE_GWEI;

    const latestTime = await networkHelpers.time.latest();
    const unlockTime = latestTime + ONE_YEAR_IN_SECS;

    // Contracts are deployed using the first signer/account by default
    const [owner, otherAccount] = await ethers.getSigners();

    const Lock = await ethers.getContractFactory("Lock");
    const lock = await Lock.deploy(unlockTime, { value: lockedAmount });

    return { lock, unlockTime, lockedAmount, owner, otherAccount };
  }

  describe("Deployment", function () {
    it("Should set the right unlockTime", async function () {
      const { lock, unlockTime } = await networkHelpers.loadFixture(
        deployOneYearLockFixture,
      );

      expect(await lock.unlockTime()).to.equal(BigInt(unlockTime));
    });

    it("Should set the right owner", async function () {
      const { lock, owner } = await networkHelpers.loadFixture(
        deployOneYearLockFixture,
      );

      expect(await lock.owner()).to.equal(owner.address);
    });

    it("Should receive and store the funds to lock", async function () {
      const { lock, lockedAmount } = await networkHelpers.loadFixture(
        deployOneYearLockFixture,
      );

      expect(await ethers.provider.getBalance(lock.target)).to.equal(
        BigInt(lockedAmount),
      );
    });

    it("Should fail if the unlockTime is not in the future", async function () {
      // We don't use the fixture here because we want a different deployment
      const latestTime = await networkHelpers.time.latest();
      const Lock = await ethers.getContractFactory("Lock");

      await expect(Lock.deploy(latestTime, { value: 1 })).to.revertedWith(
        "Unlock time should be in the future",
      );
    });
  });

  describe("Withdrawals", function () {
    describe("Validations", function () {
      it("Should revert with the right error if called too soon", async function () {
        const { lock } = await networkHelpers.loadFixture(
          deployOneYearLockFixture,
        );

        await expect(lock.withdraw()).to.be.revertedWith(
          "You can't withdraw yet",
        );
      });

      it("Should revert with the right error if called from another account", async function () {
        const { lock, unlockTime, otherAccount } =
          await networkHelpers.loadFixture(deployOneYearLockFixture);

        // We can increase the time in Hardhat Network
        await networkHelpers.time.increaseTo(unlockTime);

        // We use lock.connect() to send a transaction from another account
        await expect(
          (lock.connect(otherAccount) as any).withdraw(),
        ).to.be.revertedWith("You aren't the owner");
      });

      it("Shouldn't fail if the unlockTime has arrived and the owner calls it", async function () {
        const { lock, unlockTime } = await networkHelpers.loadFixture(
          deployOneYearLockFixture,
        );

        // Transactions are sent using the first signer by default
        await networkHelpers.time.increaseTo(unlockTime);

        await expect(lock.withdraw()).to.not.be.reverted(ethers);
      });
    });

    describe("Events", function () {
      it("Should emit an event on withdrawals", async function () {
        const { lock, unlockTime } = await networkHelpers.loadFixture(
          deployOneYearLockFixture,
        );

        await networkHelpers.time.increaseTo(unlockTime);

        await expect(lock.withdraw()).to.emit(lock, "Withdrawal");
      });
    });

    describe("Transfers", function () {
      it("Should transfer the funds out of the timelock", async function () {
        const { lock, unlockTime } = await networkHelpers.loadFixture(
          deployOneYearLockFixture,
        );

        await networkHelpers.time.increaseTo(unlockTime);

        await expect(lock.withdraw()).to.changeEtherBalance(
          provider,
          lock,
          -ONE_GWEI,
        );
      });
    });
  });
});
