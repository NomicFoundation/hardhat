const { expect } = require("chai");
const ENSModule = require("../ignition/test-registrar");
const namehash = require("eth-ens-namehash");
const labelhash = (label) =>
  hre.ethers.utils.keccak256(hre.ethers.utils.toUtf8Bytes(label));

describe("ENS", function () {
  it("should be able to create new subrecords", async function () {
    const [{ address: ACCOUNT_0 }, { address: ACCOUNT_1 }] =
      await hre.ethers.getSigners();

    // Arrange
    const { ens, resolver } = await ignition.deploy(ENSModule, {
      config: { blockConfirmations: 1 },
    });

    await ens.setSubnodeOwner(
      namehash.hash("test"),
      labelhash("alice"),
      ACCOUNT_0
    );

    // Act
    await resolver["setAddr(bytes32,address)"](
      namehash.hash("alice.test"),
      ACCOUNT_1
    );

    // Assert
    const after = await resolver["addr(bytes32)"](namehash.hash("alice.test"));

    expect(after).to.equal(ACCOUNT_1);
  });
});
