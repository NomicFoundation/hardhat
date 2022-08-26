const { buildRecipeSingleGraph } = require("@nomicfoundation/hardhat-ignition");

module.exports = buildRecipeSingleGraph("MyRecipe", (m) => {
  const foo = m.contract("Foo");

  return { foo };
});
