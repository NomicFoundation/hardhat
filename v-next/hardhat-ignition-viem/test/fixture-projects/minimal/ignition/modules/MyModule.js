// eslint-disable-next-line import/no-unused-modules
const { buildModule } = require("@ignored/hardhat-vnext-ignition-core");

module.exports = buildModule("MyModule", (m) => {
  const bar = m.contract("Bar");
  const usesContract = m.contract("UsesContract", [
    "0x0000000000000000000000000000000000000000",
  ]);

  m.call(usesContract, "setAddress", [bar]);

  return { bar, usesContract };
});
