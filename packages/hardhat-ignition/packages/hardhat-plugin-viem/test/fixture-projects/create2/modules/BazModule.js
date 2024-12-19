// eslint-disable-next-line import/no-unused-modules
const { buildModule } = require("@nomicfoundation/ignition-core");

module.exports = buildModule("BazModule", (m) => {
  const foo = m.contract("Baz");

  return { foo };
});
