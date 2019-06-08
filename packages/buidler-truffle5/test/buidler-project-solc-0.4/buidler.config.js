const { loadPluginFile } = require("@nomiclabs/buidler/plugins-testing");
loadPluginFile(__dirname + "/../../src/index");

module.exports = {
  networks: {
    withoutAccounts: {
      url: "http://localhost:8545",
      accounts: []
    },
    withGasMultiplier: {
      url: "http://localhost:8545",
      gasMultiplier: 3
    }
  },
  solc: {
    version: "0.4.25"
  }
};
