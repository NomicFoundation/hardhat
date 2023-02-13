const { BigNumber } = require("../../../../../node_modules/ethers/lib/index");

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
    maxRetries: 1,
    gasPriceIncrementPerRetry: BigNumber.from(1000),
    pollingInterval: 4,
    eventDuration: 10000,
  },
};
