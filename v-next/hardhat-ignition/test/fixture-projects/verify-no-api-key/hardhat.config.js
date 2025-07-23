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
    default: {
      mining: {
        auto: false,
      },
    },
  },
  etherscan: {
    apiKey: "",
  },
};
