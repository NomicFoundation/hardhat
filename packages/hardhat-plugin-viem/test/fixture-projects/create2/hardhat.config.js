require("../../../src/index");

module.exports = {
  solidity: "0.8.19",
  ignition: {
    strategyConfig: {
      create2: {
        salt: "a-random-salt",
      },
    },
  },
};
