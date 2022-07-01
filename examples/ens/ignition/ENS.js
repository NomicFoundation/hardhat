const { buildRecipe } = require("@nomicfoundation/hardhat-ignition");

const namehash = require("eth-ens-namehash");
const ethers = hre.ethers;
const utils = ethers.utils;
const labelhash = (label) => utils.keccak256(utils.toUtf8Bytes(label));

const reverseTld = "reverse";
const reverseTldHash = namehash.hash(reverseTld);
const resolverNode = namehash.hash("resolver");
const resolverLabel = labelhash("resolver");
const reverseLabel = labelhash("reverse");
const addrLabel = labelhash("addr");

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const ZERO_HASH =
  "0x0000000000000000000000000000000000000000000000000000000000000000";

const ACCOUNT_0 = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

const setupResolver = buildRecipe("RESOLVER", (m) => {
  const ens = m.getParam("ENS");
  const account = m.getOptionalParam("ACCOUNT", ACCOUNT_0);

  // Setup resolver
  const resolver = m.contract("PublicResolver", {
    args: [ens, ZERO_ADDRESS],
  });

  m.call(ens, "setSubnodeOwner", {
    id: "set sub-node owner for resolver",
    args: [ZERO_HASH, resolverLabel, account],
  });

  m.call(ens, "setResolver", {
    args: [resolverNode, resolver],
  });

  m.call(resolver, "setAddr(bytes32,address)", {
    args: [resolverNode, resolver],
  });

  return { resolver };
});

const setupReverseRegistrar = buildRecipe("REVERSEREGISTRAR", (m) => {
  const ens = m.getParam("ENS");
  const resolver = m.getParam("RESOLVER");
  const account = m.getOptionalParam("ACCOUNT", ACCOUNT_0);

  // Setup Reverse Registrar
  const reverseRegistrar = m.contract("ReverseRegistrar", {
    args: [ens, resolver],
  });

  m.call(ens, "setSubnodeOwner", {
    id: "set sub-node owner reverse",
    args: [ZERO_HASH, reverseLabel, account],
  });

  m.call(ens, "setSubnodeOwner", {
    id: "set sub-node addr label",
    args: [reverseTldHash, addrLabel, reverseRegistrar],
  });

  return { reverseRegistrar };
});

module.exports = buildRecipe("ENS", (m) => {
  const owner = ACCOUNT_0;

  const ens = m.contract("ENSRegistry");

  const { resolver } = m.useRecipe(setupResolver, {
    parameters: {
      ENS: ens,
      ACCOUNT: owner,
    },
  });

  const { reverseRegistrar } = m.useRecipe(setupReverseRegistrar, {
    parameters: {
      ENS: ens,
      RESOLVER: resolver,
      ACCOUNT: owner,
    },
  });

  return { ens, resolver, reverseRegistrar };
});
