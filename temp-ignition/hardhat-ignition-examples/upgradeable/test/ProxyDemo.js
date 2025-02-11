const { expect } = require("chai");

const ProxyModule = require("../ignition/modules/ProxyModule");
const UpgradeModule = require("../ignition/modules/UpgradeModule");

describe("Demo Proxy", function () {
  describe("Proxy interaction", async function () {
    it("Should be interactable via proxy", async function () {
      const [, otherAccount] = await ethers.getSigners();

      const { demo } = await ignition.deploy(ProxyModule);

      expect(await demo.connect(otherAccount).version()).to.equal("1.0.0");
    });
  });

  describe("Upgrading", function () {
    it("Should have upgraded the proxy to DemoV2", async function () {
      const [, otherAccount] = await ethers.getSigners();

      const { demo } = await ignition.deploy(UpgradeModule);

      expect(await demo.connect(otherAccount).version()).to.equal("2.0.0");
    });

    it("Should have set the name during upgrade", async function () {
      const [, otherAccount] = await ethers.getSigners();

      const { demo } = await ignition.deploy(UpgradeModule);

      expect(await demo.connect(otherAccount).name()).to.equal("Example Name");
    });
  });
});
