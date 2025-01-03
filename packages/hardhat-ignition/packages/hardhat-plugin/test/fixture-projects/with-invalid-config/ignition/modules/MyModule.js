const { buildModule } = require("@nomicfoundation/ignition-core");

module.exports = buildModule("MyModule", (m) => {
  const bar = m.contract("Bar");
  const usesContract = m.contract("UsesContract", {
    args: ["0x0000000000000000000000000000000000000000"],
  });

  m.call(usesContract, "setAddress", {
    args: [bar],
  });

  return { bar, usesContract };
});
