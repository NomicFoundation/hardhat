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
    blockConfirmations: 0,
    blockPollingInterval: 100,
    transactionTimeoutInterval: 60 * 1000,
  },
};
