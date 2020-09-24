const { loadPluginFile } = require("@nomiclabs/buidler/plugins-testing");
loadPluginFile(__dirname + "/../../src/index");

module.exports = {
  solpp: {
    defs: {
      foo: () => "foo",
      bar: "bar",
    },
  },
};
