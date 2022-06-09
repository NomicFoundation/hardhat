const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");

describe("Lock", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup this once, snapshot that state,
  // and Hardhat Network to that snapshopt on every test.
  async function deployOneYearLock() {
    const ONE_YEAR_IN_SECS = 365 * 24 * 60 * 60;
    const ONE_GWEI = 1_000_000_000;

    const lockedAmount = ONE_GWEI;
    const unlockTime = (await time.latest()) + ONE_YEAR_IN_SECS;

    // Contracts are deployed using the first signer/account by default
    const [owner] = await ethers.getSigners();

    const Lock = await ethers.getContractFactory("Lock");
    const lock = await Lock.deploy(unlockTime, { value: lockedAmount });

    return { lock, unlockTime, lockedAmount, owner };
  }

  describe("Deployment", function () {
    it("Should set the right unlockTime", async function () {
      const { lock, unlockTime } = await loadFixture(deployOneYearLock);

      expect(await lock.unlockTime()).to.equal(unlockTime);
    });

    it("Should set the right owner", async function () {
      const { lock, owner } = await loadFixture(deployOneYearLock);

      expect(await lock.owner()).to.equal(owner.address);
    });

    it("Should receive and store the funds to lock", async function () {
      const { lock, lockedAmount } = await loadFixture(deployOneYearLock);

      expect(await ethers.provider.getBalance(lock.address)).to.equal(
        lockedAmount
      );
    });
  });

  describe("Withdrawals", function () {
    describe("Validations", function () {
      it("Should revert with the right error if called too soon", async function () {
        const { lock } = await loadFixture(deployOneYearLock);

        await expect(lock.withdraw()).to.revertedWith("You can't withdraw yet");
      });

      it("Shouldn't fail if the unlockTime has arrived", async function () {
        const { lock, unlockTime } = await loadFixture(deployOneYearLock);

        // We can increase the time in Hardhat Network
        await time.increaseTo(unlockTime);

        await expect(lock.withdraw()).not.to.be.reverted;
      });

      it("Shouldn't revert with the right error if called from another account", async function () {
        const { lock, unlockTime } = await loadFixture(deployOneYearLock);
        const [owner, other] = await ethers.getSigners();

        await time.increaseTo(unlockTime);

        // We use lock.connect() to send a transaction from another account
        await expect(lock.connect(other).withdraw()).to.revertedWith(
          "You aren't the owner"
        );
      });
    });

    describe("Events", function () {
      it("Should emit an event on withdrawals", async function () {
        const { lock, unlockTime, lockedAmount } = await loadFixture(
          deployOneYearLock
        );
        await time.increaseTo(unlockTime);

        await expect(lock.withdraw())
          .to.emit(lock, "Withdral")
          .withArgs(lockedAmount, anyValue); // We accept any value as _when arg
      });
    });

    describe("Transfers", function () {
      it("Should transfer the funds to the owner", async function () {
        const { lock, unlockTime, lockedAmount, owner } = await loadFixture(
          deployOneYearLock
        );
        await time.increaseTo(unlockTime);

        await expect(lock.withdraw()).to.changeEtherBalance(
          owner,
          lockedAmount
        );
      });
    });
  });
});
