require("../../src/index");

module.exports = {
  networks: {
    withoutAccounts: {
      url: "http://localhost:8545",
      accounts: []
    }
  },
  solc: {
    version: "0.5.1"
  }
};
