// ./ignition/FeeTesterModule.js
const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("FeeTesterModule", (m) => {
  const feeTester1 = m.contract("FeeTester");

  m.call(feeTester1, "deleteOwner");

  const feeTester2 = m.contract("FeeTester", [], { id: "feeTester2" });

  return { feeTester1, feeTester2 };
});
