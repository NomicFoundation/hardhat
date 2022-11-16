require("../../../src/index");

module.exports = {
  networks: {
    withoutAccounts: {
      url: "http://127.0.0.1:8545",
      accounts: [],
    },
    withGasMultiplier: {
      url: "http://127.0.0.1:8545",
      gasMultiplier: 3,
    },
  },
  solidity: "0.4.25",
};
