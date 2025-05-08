require("../../../src/index");

module.exports = {
  solidity: {
    profiles: {
      default: {
        version: "0.8.19",
      },
      production: {
        version: "0.8.19",
      },
    },
  },
  networks: {
    hardhat: {
      mining: {
        auto: false,
      },
    },
  },
  etherscan: {
    apiKey: "",
  },
};
