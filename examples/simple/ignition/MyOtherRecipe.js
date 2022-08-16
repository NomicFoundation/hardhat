const { buildRecipe } = require("@nomicfoundation/hardhat-ignition");

module.exports = buildRecipe("MyOtherRecipe", (m) => {
  const foo = m.contract("Foo");
  const foo2 = m.contract("Foo", { id: "Foo2" });

  m.call(foo, "inc", {
    args: [1],
  });

  m.call(foo2, "inc", {
    args: [1],
  });

  return { foo };
});
