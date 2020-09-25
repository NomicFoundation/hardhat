const { loadPluginFile } = require("hardhat/plugins-testing");
loadPluginFile(__dirname + "/../../src/index");

module.exports = {
  solpp: {
    defs: {
      foo: () => "foo",
      bar: "bar",
    },
  },
};
