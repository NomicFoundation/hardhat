const { loadPluginFile } = require("@nomiclabs/buidler/plugins-testing");

loadPluginFile(__dirname + "/../../src/index");

task("accounts", "Get all accounts in current network", async () => {
  return await ethereum.send("eth_accounts");
});

module.exports = {};
