const { buildModule } = require("ignition")

module.exports = buildModule("MyModule", (m) => {
  const foo = m.contract("Foo")

  m.call(foo, "inc")

  return { foo }
});
