require("../../../src/index");

module.exports = {
  solidity: "0.8.19",
  ignition: {
    strategyConfig: {
      create2: {
        salt: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890aaaaaa",
      },
    },
  },
};
