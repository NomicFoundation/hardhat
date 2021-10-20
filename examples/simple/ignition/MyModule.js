const { buildModule } = require("ignition")

module.exports = buildModule("MyModule", (m) => {
  const foo = m.contract("Foo")
  const bar = m.contract("Bar", {
    args: [foo]
  })
  const bar2 = m.contract("Bar", {
    id: "Bar2",
    args: [foo]
  })

  return { foo, bar }
});
