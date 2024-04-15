const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

const ProxyModule = require("./ProxyModule");

/**
 * This module upgrades the proxy to a new version of the Demo contract.
 */
const upgradeModule = buildModule("UpgradeModule", (m) => {
  // Make sure we're using the account that owns the ProxyAdmin contract.
  const proxyAdminOwner = m.getAccount(0);

  // Get the proxy and proxy admin from the previous module.
  const { proxyAdmin, proxy } = m.useModule(ProxyModule);

  // This is the new version of the Demo contract that we want to upgrade to.
  const demoV2 = m.contract("DemoV2");

  // Upgrade the proxy to the new version of the Demo contract.
  // This function also accepts a data parameter, which can be used to call a function,
  // but we don't need it here so we pass an empty hex string ("0x").
  m.call(proxyAdmin, "upgradeAndCall", [proxy, demoV2, "0x"], {
    from: proxyAdminOwner,
  });

  // Return the proxy and proxy admin so that they can be used by other modules.
  return { proxyAdmin, proxy };
});

/**
 * This is the final module that will be run.
 *
 * It takes the proxy from the previous module and uses it to create a local contract instance
 * for the DemoV2 contract. This allows us to interact with the DemoV2 contract via the proxy.
 */
const demoV2Module = buildModule("DemoV2Module", (m) => {
  // Get the proxy from the previous module.
  const { proxy } = m.useModule(upgradeModule);

  // Create a local contract instance for the DemoV2 contract.
  // This line tells Hardhat Ignition to use the DemoV2 ABI for the contract at the proxy address.
  // This allows us to call functions on the DemoV2 contract via the proxy.
  const demo = m.contractAt("DemoV2", proxy);

  // Return the contract instance so that it can be used by other modules or in tests.
  return { demo };
});

module.exports = demoV2Module;
