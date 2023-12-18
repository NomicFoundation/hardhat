// ./ignition/LockModule.js
const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

/**
 * This is the first module that will be run. It deploys the proxy and the
 * proxy admin, and returns them so that they can be used by other modules.
 */
const proxyModule = buildModule("ProxyModule", (m) => {
  // This address is the owner of the ProxyAdmin contract,
  // so it will be the only account that can upgrade the proxy when needed.
  const proxyAdminOwner = m.getAccount(0);

  // This is our contract that will be proxied.
  // We will upgrade this contract with a new version later.
  const demo = m.contract("Demo");

  // The TransparentUpgradeableProxy contract creates the ProxyAdmin within its constructor.
  // To read more about how this proxy is implemented, you can view the source code and comments here:
  // https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v5.0.1/contracts/proxy/transparent/TransparentUpgradeableProxy.sol
  const proxy = m.contract("TransparentUpgradeableProxy", [
    demo,
    proxyAdminOwner,
    "0x",
  ]);

  // We need to get the address of the ProxyAdmin contrac that was created by the TransparentUpgradeableProxy
  // so that we can use it to upgrade the proxy later.
  const proxyAdminAddress = m.readEventArgument(
    proxy,
    "AdminChanged",
    "newAdmin"
  );

  // Here we use m.contractAt(...) to create a contract instance for the ProxyAdmin that we can interact with.
  const proxyAdmin = m.contractAt("ProxyAdmin", proxyAdminAddress);

  // Return the proxy and proxy admin so that they can be used by other modules.
  return { proxyAdmin, proxy };
});

/**
 * This is the second module that will be run. It upgrades the proxy to a new
 * version of the Demo contract.
 */
const upgradeModule = buildModule("UpgradeModule", (m) => {
  // Make sure we're account that owns the ProxyAdmin contract.
  const proxyAdminOwner = m.getAccount(0);

  // Get the proxy and proxy admin from the previous module.
  const { proxyAdmin, proxy } = m.useModule(proxyModule);

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
 * This is the third and final module that will be run.
 *
 * It takes the proxy from the previous module and uses it to create a local contract instance
 * for the DemoV2 contract. This allows us to interact with the DemoV2 contract via the proxy.
 */
const interactableModule = buildModule("InteractableModule", (m) => {
  // Get the proxy from the previous module.
  const { proxy } = m.useModule(upgradeModule);

  // Create a local contract instance for the DemoV2 contract.
  // This line tells Hardhat Ignition to treat the contract at the proxy address as an DemoV2 contract.
  // This allows us to call functions on the DemoV2 contract via the proxy.
  const demo = m.contractAt("DemoV2", proxy);

  // Return the contract instance so that it can be used by other modules or in tests.
  return { demo };
});

module.exports = interactableModule;
