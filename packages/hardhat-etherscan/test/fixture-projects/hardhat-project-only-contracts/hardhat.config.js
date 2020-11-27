require("@nomiclabs/hardhat-ethers");

require("../../../src/index");

module.exports = {
  etherscan: {
    // apiKey: process.env.ETHERSCAN_API_KEY,
  },
  solidity: {
    version: "0.5.15",
  },
  paths: {
    artifacts: "artifacts-dir",
  },
};
