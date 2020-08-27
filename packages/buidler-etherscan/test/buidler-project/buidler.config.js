const { loadPluginFile } = require("@nomiclabs/buidler/plugins-testing");

usePlugin("@nomiclabs/buidler-ethers");

loadPluginFile(__dirname + "/../../src/index");

module.exports = {
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY || "",
  },
  solc: {
    version: "0.5.15",
  },
  networks: {
    testnet: {
      url: process.env.TESTNET_NETWORK_URL,
    },
  },
  paths: {
    artifacts: "artifacts-dir",
  },
};
