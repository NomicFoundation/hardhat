require("../../../src/index");

module.exports = {
  networks: {
    withoutAccounts: {
      url: "http://127.0.0.1:8545",
      accounts: [],
    },
  },
  solidity: "0.6.1",
};
