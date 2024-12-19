require("../../../src/index");

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: "0.8.19",
  networks: {
    hardhat: {
      mining: {
        auto: false,
      },
      chainId: 88888,
    },
  },
};
