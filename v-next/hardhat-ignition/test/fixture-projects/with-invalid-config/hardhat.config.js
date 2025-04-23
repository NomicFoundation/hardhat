export default {
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
