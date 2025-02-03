const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("ResetModule", (m) => {
  const a = m.contract("Foo", [], {
    id: "A",
  });

  return { a };
});
