const { buildRecipeSingleGraph } = require("@nomicfoundation/hardhat-ignition");

module.exports = buildRecipeSingleGraph("ParamRecipe", (m) => {
  const incAmount = m.getParam("IncAmount");

  const foo = m.contract("Foo");

  m.call(foo, "inc", {
    args: [incAmount],
  });

  return { foo };
});
