// eslint-disable-next-line import/no-unused-modules
const { defineModule } = require("@ignored/ignition-core");

module.exports = defineModule("MyModule", (m) => {
  const bar = m.contract("Bar");
  const usesContract = m.contract("UsesContract", [
    "0x0000000000000000000000000000000000000000",
  ]);

  m.call(usesContract, "setAddress", [bar]);

  return { bar, usesContract };
});
