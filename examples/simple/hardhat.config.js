require("@nomicfoundation/hardhat-ignition");

module.exports = {
  solidity: "0.8.5",
  networks: {
    hardhat: {
      mining: {
        // auto: false
      },
      initialBaseFeePerGas: 1_000_000_000,
    },
  },
};
