// eslint-disable-next-line import/no-unused-modules
const { buildModule } = require("@nomicfoundation/ignition-core");

module.exports = buildModule("OwnModule", (m) => {
  const ownable = m.contract("Ownable");

  return { ownable };
});
