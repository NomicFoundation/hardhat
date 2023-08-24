const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { expect } = require("chai");
const CompleteModule = require("../ignition/CompleteModule");

describe.skip("Complete", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployCompleteFixture() {
    const {
      basic,
      library,
      libFromArtifact,
      withLib,
      duplicate,
      duplicateWithLib,
    } = await ignition.deploy(CompleteModule, {
      config: {
        blockConfirmations: 1,
      },
    });

    return {
      basic,
      library,
      libFromArtifact,
      withLib,
      duplicate,
      duplicateWithLib,
    };
  }

  it("Should transfer funds to the BasicContract", async () => {
    const { basic } = await loadFixture(deployCompleteFixture);

    expect(await ethers.provider.getBalance(basic.address)).to.equal(123n);
  });

  it("Should add two to a given number", async () => {
    const { withLib } = await loadFixture(deployCompleteFixture);

    expect(await withLib.readonlyFunction(40)).to.equal(42);
  });
});
