const { buildRecipe } = require("@nomicfoundation/hardhat-ignition");

module.exports = buildRecipe("ParamRecipe", (m) => {
  const incAmount = m.getParam("IncAmount");

  const foo = m.contract("Foo");

  m.call(foo, "inc", {
    args: [incAmount],
  });

  return { foo };
});
