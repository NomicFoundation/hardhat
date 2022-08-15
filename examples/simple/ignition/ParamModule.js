const { buildModule } = require("@nomicfoundation/hardhat-ignition");

module.exports = buildModule("ParamModule", (m) => {
  const incAmount = m.getParam("IncAmount");

  const foo = m.contract("Foo");

  m.call(foo, "inc", {
    args: [incAmount],
  });

  return { foo };
});
