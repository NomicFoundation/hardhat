const { loadPluginFile } = require("@nomiclabs/buidler/plugins-testing");
loadPluginFile(__dirname + "/../../../src/index");

module.exports = {
  vyper: {
    version: "0.1.0b10",
  },
};
