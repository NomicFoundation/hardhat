require("@nomiclabs/hardhat-ethers");

require("../../../src/index");

module.exports = {
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
  solidity: {
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
