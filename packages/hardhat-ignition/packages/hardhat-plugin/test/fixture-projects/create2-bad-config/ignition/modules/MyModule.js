const { buildModule } = require("@nomicfoundation/ignition-core");

module.exports = buildModule("MyModule", (m) => {
  const foo = m.contract("Foo");

  return { foo };
});
