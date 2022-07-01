const { expect } = require("chai");
const ENSModule = require("../ignition/test-registrar");
const namehash = require("eth-ens-namehash");
const labelhash = (label) =>
  hre.ethers.utils.keccak256(hre.ethers.utils.toUtf8Bytes(label));

const ACCOUNT_0 = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
const ACCOUNT_1 = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";

describe("ENS", function () {
  it("should be able to create new subrecords", async function () {
    // Arrange
    const { ens, resolver } = await ignition.deploy(ENSModule);

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
