const {
  buildRecipe,
  buildModule,
} = require("@nomicfoundation/hardhat-ignition");

const myModule = buildModule("MyModule", (m) => {
  const foo = m.contract("Foo");

  const bar = m.contract("Bar", { args: [foo] });

  return { foo, bar };
});

module.exports = buildRecipe("MyRecipe", (m) => {
  const { foo, bar } = m.useModule(myModule);

  const qux = m.contract("Qux", { args: [foo, 1] });

  return { foo, bar, qux };
});
