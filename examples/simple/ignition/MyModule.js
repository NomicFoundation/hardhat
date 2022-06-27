const { buildModule } = require("@nomicfoundation/hardhat-ignition");

module.exports = buildModule("MyModule", (m) => {
  const foo = m.contract("Foo");

  // m.call(foo, "inc", {
  //   args: [1]
  // })
  //
  return { foo };
});
