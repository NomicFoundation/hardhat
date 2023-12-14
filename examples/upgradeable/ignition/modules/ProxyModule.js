// ./ignition/LockModule.js
const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

const proxyModule = buildModule("ProxyModule", (m) => {
  const proxyAdminOwner = m.getAccount(0);

  const box = m.contract("Box");

  const proxy = m.contract("TransparentUpgradeableProxy", [
    box,
    proxyAdminOwner,
    "0x",
  ]);

  const proxyAdminAddress = m.readEventArgument(
    proxy,
    "AdminChanged",
    "newAdmin"
  );

  const proxyAdmin = m.contractAt("ProxyAdmin", proxyAdminAddress);

  return { proxyAdmin, proxy };
});

const upgradeModule = buildModule("UpgradeModule", (m) => {
  const proxyAdminOwner = m.getAccount(0);

  const { proxyAdmin, proxy } = m.useModule(proxyModule);

  const upgradedBox = m.contract("UpgradedBox");

  m.call(proxyAdmin, "upgradeAndCall", [proxy, upgradedBox, "0x"], {
    from: proxyAdminOwner,
  });

  return { proxyAdmin, proxy };
});

const interactableModule = buildModule("InteractableModule", (m) => {
  const { proxy } = m.useModule(upgradeModule);

  const box = m.contractAt("UpgradedBox", proxy);

  return { box };
});

module.exports = interactableModule;
