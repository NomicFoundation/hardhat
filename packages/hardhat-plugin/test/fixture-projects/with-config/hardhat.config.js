require("../../../src/index");

module.exports = {
  networks: {
    hardhat: {
      mining: {
        auto: false,
      },
      ignition: {
        maxFeePerGasLimit: 2n,
        maxPriorityFeePerGas: 3n,
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
