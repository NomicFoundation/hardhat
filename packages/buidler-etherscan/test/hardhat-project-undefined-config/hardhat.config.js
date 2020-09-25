const { loadPluginFile } = require("hardhat/plugins-testing");

loadPluginFile(__dirname + "/../../src/index");

module.exports = {
  solc: {
    version: "0.5.15",
  },
};
