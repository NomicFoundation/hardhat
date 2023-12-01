require("hardhat-gas-reporter");

module.exports = {
  solidity: "0.8.20",
  gasReporter: {
    enabled: process.env.REPORT_GAS ? true : false,
  },
};
