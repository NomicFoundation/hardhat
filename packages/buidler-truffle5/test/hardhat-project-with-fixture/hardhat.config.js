const { loadPluginFile } = require("hardhat/plugins-testing");
loadPluginFile(__dirname + "/../../src/index");

module.exports = {
  solidity: "0.5.15",
};
