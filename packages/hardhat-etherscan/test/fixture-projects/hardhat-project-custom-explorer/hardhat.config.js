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
    localhost: {
      chainId: 1337,
      // Custom explorer definition
      explorer: {
        apiURL: "http://localhost:26000/api",
        browserURL: "http://localhost:26000/",
      },
    },
  },
  paths: {
    artifacts: "artifacts-dir",
  },
};
