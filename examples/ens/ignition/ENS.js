const { defineModule } = require("@ignored/hardhat-ignition");

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

const registryModule = defineModule("REGISTRY", (m) => {
  const ens = m.contract("ENSRegistry");

  return { ens };
});

const resolverModule = defineModule("RESOLVER", (m) => {
  const { ens } = m.useModule(registryModule);
  const account = m.getAccount(0);

  // Setup resolver
  const resolver = m.contract("PublicResolver", [ens, ZERO_ADDRESS]);

  m.call(ens, "setSubnodeOwner", [ZERO_HASH, resolverLabel, account], {
    id: "set-subnode-owner-for-resolver",
  });

  m.call(ens, "setResolver", [resolverNode, resolver]);

  m.call(resolver, "setAddr(bytes32,address)", [resolverNode, resolver]);

  return { resolver };
});

const reverseRegistrarModule = defineModule("REVERSEREGISTRAR", (m) => {
  const account = m.getAccount(0);

  const { ens } = m.useModule(registryModule);
  const { resolver } = m.useModule(resolverModule);

  // Setup Reverse Registrar
  const reverseRegistrar = m.contract("ReverseRegistrar", [ens, resolver]);

  m.call(ens, "setSubnodeOwner", [ZERO_HASH, reverseLabel, account], {
    id: "set-subnode-owner-reverse",
  });

  m.call(
    ens,
    "setSubnodeOwner",
    [reverseTldHash, addrLabel, reverseRegistrar],
    {
      id: "set-subnode-addr-label",
    }
  );

  return { reverseRegistrar };
});

module.exports = defineModule("ENS", (m) => {
  const { ens } = m.useModule(registryModule);
  const { resolver } = m.useModule(resolverModule);
  const { reverseRegistrar } = m.useModule(reverseRegistrarModule);

  return { ens, resolver, reverseRegistrar };
});
