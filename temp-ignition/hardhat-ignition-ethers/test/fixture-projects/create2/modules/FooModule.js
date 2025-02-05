// eslint-disable-next-line import/no-unused-modules
const { buildModule } = require("@nomicfoundation/ignition-core");

module.exports = buildModule("FooModule", (m) => {
  const foo = m.contract("Foo");

  return { foo };
});
