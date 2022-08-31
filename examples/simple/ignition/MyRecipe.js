const { buildRecipeSingleGraph } = require("@nomicfoundation/hardhat-ignition");

module.exports = buildRecipeSingleGraph("MyRecipe", (m) => {
  const foo = m.contract("Foo");

  const bar = m.contract("Bar", { args: [foo] });

  const qux = m.contract("Qux", { args: [foo] });

  return { foo, bar, qux };
});
