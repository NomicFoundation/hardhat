const { loadPluginFile } = require("hardhat/plugins-testing");
loadPluginFile(__dirname + "/../../../src/index");

module.exports = {
  vyper: {
    version: "0.1.0b10",
  },
  solidity: "0.5.15",
};
