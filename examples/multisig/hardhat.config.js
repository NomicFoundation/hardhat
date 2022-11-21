require("@nomicfoundation/hardhat-toolbox");
require("@ignored/hardhat-ignition");

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: "0.8.5",
  networks: {
    hardhat: {
      mining: {
        // auto: false
      },
      blockGasLimit: 5_000_000_000,
      initialBaseFeePerGas: 1_000_000_000,
    },
  },
};
