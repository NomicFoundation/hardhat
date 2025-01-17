require("../../../src/index");

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: "0.8.19",
  ignition: {
    strategyConfig: {
      create2: {
        salt: undefined, // Missing salt
      },
    },
  },
};
