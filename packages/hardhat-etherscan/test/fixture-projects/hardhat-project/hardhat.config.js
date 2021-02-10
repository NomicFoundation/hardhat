require("@nomiclabs/hardhat-ethers");

require("../../../src/index");

module.exports = {
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
  solidity: {
    compilers: [
      {
        version: "0.5.15",
      },
      {
        version: "0.7.5",
      },
    ],
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
