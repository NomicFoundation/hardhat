const { buildRecipe } = require("@nomicfoundation/hardhat-ignition");

module.exports = buildRecipe("MyRecipe", (m) => {
  const foo = m.contract("Foo");

  const bar = m.contract("Bar", { args: [foo] });

  const qux = m.contract("Qux", { args: [foo] });

  return { foo, bar, qux };
});
