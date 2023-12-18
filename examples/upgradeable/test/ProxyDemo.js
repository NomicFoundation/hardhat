const { expect } = require("chai");

const ProxyModule = require("../ignition/modules/ProxyModule");

describe("Demo Proxy", function () {
  describe("Upgrading", function () {
    it("Should have upgraded the proxy to DemoV2", async function () {
      const [owner, otherAccount] = await ethers.getSigners();

      const { demo } = await ignition.deploy(ProxyModule);

      expect(await demo.connect(otherAccount).version()).to.equal("2.0.0");
    });
  });
});
