const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");
const namehash = require("eth-ens-namehash");

const setupENSRegistry = require("./ENS");

const labelhash = (label) =>
  hre.ethers.keccak256(hre.ethers.toUtf8Bytes(label));

const ZERO_HASH =
  "0x0000000000000000000000000000000000000000000000000000000000000000";

const ACCOUNT_0 = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

module.exports = buildModule("TEST_registrar", (m) => {
  const tld = "test";
  const tldHash = namehash.hash(tld);
  const tldLabel = labelhash(tld);

  const { ens, resolver, reverseRegistrar } = m.useModule(setupENSRegistry);

  // Setup registrar
  const registrar = m.contract("FIFSRegistrar", [ens, tldHash]);

  m.call(ens, "setSubnodeOwner", [ZERO_HASH, tldLabel, ACCOUNT_0], {
    id: "set_subnode_owner_for_registrar",
  });

  return { ens, resolver, registrar, reverseRegistrar };
});
