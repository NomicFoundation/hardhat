const { loadPluginFile } = require("@nomiclabs/buidler/plugins-testing");

loadPluginFile(__dirname + "/../../src/index");

module.exports = {
  solc: {
    version: "0.5.15",
  },
};
