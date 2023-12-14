const {
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");
const ProxyModule = require("../ignition/modules/ProxyModule");

describe("UpgradedBox", function () {
  async function deployFixture() {
    const [owner, otherAccount] = await ethers.getSigners();

    const { box } = await ignition.deploy(ProxyModule);

    return { box, owner, otherAccount };
  }

  describe("Upgrading", function () {
    it("Should have upgraded the proxy to UpgradedBox", async function () {
      const { box, otherAccount } = await loadFixture(deployFixture);

      expect(await box.connect(otherAccount).version()).to.equal("2.0.0");
    });
  });
});
