require("@nomiclabs/hardhat-ethers");

require("../../../src/index");

module.exports = {
  etherscan: {
    apiKey: "something",
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
    hardhat: {
      // Rinkeby chain ID
      chainId: 4,
    },
  },
  paths: {
    artifacts: "artifacts-dir",
  },
};
