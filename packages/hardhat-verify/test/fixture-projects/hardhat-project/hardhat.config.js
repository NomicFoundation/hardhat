require("@nomicfoundation/hardhat-ethers");

require("../../../src/index");

module.exports = {
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
  etherscan: {
    apiKey: {
      hardhat: "hardhatApiKey",
    },
    customChains: [
      {
        network: "hardhat",
        chainId: 31337,
        urls: {
          apiURL: "https://api-hardhat.etherscan.io/api",
          browserURL: "https://hardhat.etherscan.io",
        },
      },
    ],
  },
  sourcify: {
    enabled: false,
    customChains: [
      {
        network: "hardhat",
        chainId: 31337,
      },
    ],
  },
};
