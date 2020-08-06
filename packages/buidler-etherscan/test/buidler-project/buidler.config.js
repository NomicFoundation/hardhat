const { loadPluginFile } = require("@nomiclabs/buidler/plugins-testing");

loadPluginFile(__dirname + "/../../src/index");

module.exports = {
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY || "testtoken",
  },
  solc: {
    version: "0.5.15",
  },
  paths: {
    artifacts: "artifacts-dir",
  },
};
