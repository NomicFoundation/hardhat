const { buildModule } = require("@ignored/hardhat-ignition");

module.exports = buildModule("Create2Factory", (m) => {
  const create2 = m.contract("Create2Factory");

  return { create2 };
});
