export default {
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
  ignition: {
    requiredConfirmations: 0,
    blockPollingInterval: 100,
    timeBeforeBumpingFees: 60 * 1000,
    maxFeeBumps: 2,
  },
};
