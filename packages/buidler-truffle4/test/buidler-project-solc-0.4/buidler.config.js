require("../../src/index");

module.exports = {
  networks: {
    withoutAccounts: {
      url: "http://localhost:8545",
      accounts: []
    }
  },
  solc: {
    version: "0.4.25"
  }
};
