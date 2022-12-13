const { ethers } = require("ethers");
const { buildModule } = require("@ignored/hardhat-ignition");

const MultisigArtifact = require("../artifacts/contracts/Multisig.sol/Multisig.json");

const ACCOUNT_0 = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
const ACCOUNT_1 = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";

module.exports = buildModule("MultisigModule", (m) => {
  const owners = [ACCOUNT_0, ACCOUNT_1];
  const required = 1;
  const value = ethers.utils.parseUnits("100");

  // todo: support arbitrary tx
  const multisig = m.contract("Multisig", MultisigArtifact, {
    args: [owners, required],
    value,
  });

  const call = m.call(multisig, "submitTransaction", {
    args: [ACCOUNT_0, ethers.utils.parseUnits("50"), "0x00"],
    after: [multisig],
  });

  // todo: support sending via non-default account
  const event = m.awaitEvent(multisig, "Confirmation", {
    args: [ACCOUNT_0, 0],
    after: [call],
  });

  m.call(multisig, "executeTransaction", {
    args: [event.params.transactionId],
    after: [event],
  });

  return { multisig, event };
});
