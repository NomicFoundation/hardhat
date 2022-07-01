const { buildRecipe } = require("@nomicfoundation/hardhat-ignition");
const namehash = require("eth-ens-namehash");

const setupENSRegistry = require("./ENS");

const labelhash = (label) =>
  hre.ethers.utils.keccak256(hre.ethers.utils.toUtf8Bytes(label));

const ZERO_HASH =
  "0x0000000000000000000000000000000000000000000000000000000000000000";

const ACCOUNT_0 = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

module.exports = buildRecipe("`TEST` registrar", (m) => {
  const tld = "test";
  const tldHash = namehash.hash(tld);
  const tldLabel = labelhash(tld);

  const { ens, resolver, reverseRegistrar } = m.useRecipe(setupENSRegistry);

  // Setup registrar
  const registrar = m.contract("FIFSRegistrar", {
    args: [ens, tldHash],
  });

  m.call(ens, "setSubnodeOwner", {
    id: "set sub-node owner for registrar",
    args: [ZERO_HASH, tldLabel, ACCOUNT_0],
  });

  return { ens, resolver, registrar, reverseRegistrar };
});
