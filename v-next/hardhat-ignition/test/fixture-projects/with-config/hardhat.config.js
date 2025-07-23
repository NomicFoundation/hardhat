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
  },
};
