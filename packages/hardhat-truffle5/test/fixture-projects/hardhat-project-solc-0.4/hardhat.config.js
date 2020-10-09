require("../../../src/index");

module.exports = {
  networks: {
    withoutAccounts: {
      url: "http://localhost:8545",
      accounts: [],
    },
    withGasMultiplier: {
      url: "http://localhost:8545",
      gasMultiplier: 3,
    },
  },
  solidity: "0.4.25",
};
