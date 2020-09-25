const { loadPluginFile } = require("hardhat/plugins-testing");

loadPluginFile(__dirname + "/../../src/index");

module.exports = {
  etherscan: {
    apiKey: "testtoken",
  },
  solc: {
    version: "0.5.15",
  },
};
