require("../../../src/index");

module.exports = {
  networks: {
    withoutAccounts: {
      url: "http://localhost:8545",
      accounts: [],
    },
  },
  solidity: "0.4.25",
};
