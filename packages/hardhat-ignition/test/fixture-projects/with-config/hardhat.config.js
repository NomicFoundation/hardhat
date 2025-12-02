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
        gasPrice: 1n,
        disableFeeBumping: false,
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
    disableFeeBumping: true,
    maxRetries: 10,
    retryInterval: 1000,
  },
};
