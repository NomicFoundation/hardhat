// eslint-disable-next-line import/no-unused-modules
const { buildModule } = require("@ignored/hardhat-vnext-ignition-core");

module.exports = buildModule("BazModule", (m) => {
  const foo = m.contract("Baz");

  return { foo };
});
