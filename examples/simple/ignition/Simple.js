const { buildModule } = require("@ignored/hardhat-ignition");

module.exports = buildModule("Simple", (m) => {
  const incAmount = m.getParam("IncAmount");

  const simple = m.contract("Simple");

  m.call(simple, "inc", {
    args: [incAmount],
  });

  return { simple };
});
