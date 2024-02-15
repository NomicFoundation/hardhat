require("../../../src/index");

module.exports = {
  networks: {
    hardhat: {
      mining: {
        auto: false,
      },
    },
  },
  ignition: {
    requiredConfirmations: 10,
    blockPollingInterval: 100,
    timeBeforeBumpingFees: 60 * 1000,
    maxFeeBumps: 2,
    strategyConfig: {
      create2: {
        salt: "custom-salt",
      },
    },
  },
};
