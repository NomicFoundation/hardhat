const { ethers } = require("ethers");
const { buildModule } = require("@ignored/hardhat-ignition");

const MultisigArtifact = require("../artifacts/contracts/Multisig.sol/Multisig.json");

module.exports = buildModule("MultisigModule", (m) => {
  const [ACCOUNT_0, ACCOUNT_1] = m.accounts;

  const owners = [ACCOUNT_0, ACCOUNT_1];
  const required = 2;
  const value = ethers.utils.parseUnits("100");

  const multisig = m.contract("Multisig", MultisigArtifact, {
    args: [owners, required],
  });

  const funding = m.sendETH(multisig, { value, after: [multisig] });

  // contract auto confirms when you submit
  const call = m.call(multisig, "submitTransaction", {
    args: [ACCOUNT_0, ethers.utils.parseUnits("50"), "0x00"],
    after: [funding],
  });

  // second confirmation
  const confirm = m.call(multisig, "confirmTransaction", {
    args: [0],
    after: [call],
    from: ACCOUNT_1,
  });

  const event = m.event(multisig, "Confirmation", {
    args: [ACCOUNT_1, 0],
    after: [confirm],
  });

  m.call(multisig, "executeTransaction", {
    args: [event.params.transactionId],
    after: [event],
  });

  return { multisig };
});
