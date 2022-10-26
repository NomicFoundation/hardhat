const { buildModule } = require("@ignored/hardhat-ignition");

module.exports = buildModule("Simple", (m) => {
  const incAmount = m.getOptionalParam("IncAmount", 1);

  const simple = m.contract("Simple");

  m.call(simple, "inc", {
    args: [incAmount],
  });

  return { simple };
});
