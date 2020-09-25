const { loadPluginFile } = require("hardhat/plugins-testing");

loadPluginFile(__dirname + "/../../src/index");

module.exports = {
  etherscan: {
    apiKey: "testtoken",
  },
  solidity: {
    version: "0.5.15",
  },
};
