const { buildRecipe } = require("@nomicfoundation/hardhat-ignition");

module.exports = buildRecipe("MyRecipe", (m) => {
  const foo = m.contract("Foo");

  // m.call(foo, "inc", {
  //   args: [1]
  // })
  //
  return { foo };
});
