const { loadPluginFile } = require("@nomiclabs/buidler/plugins-testing");

loadPluginFile(__dirname + "/../../src/index");

module.exports = {
  defaultNetwork: "ganache",
  networks: {
    ganache: {
      url: "http://127.0.0.1:8555",
      gasPrice: 20000000000,
      gasLimit: 6000000000,
      defaultBalanceEther: 9,
      totalAccounts: 3,
      mnemonic:
        "polar velvet stereo oval echo senior cause cruel tube hobby exact angry",
    },
  },
};
