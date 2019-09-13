const {TASK_RUN, TASK_TEST} = require("@nomiclabs/buidler/builtin-tasks/task-names");

const { loadPluginFile } = require("@nomiclabs/buidler/plugins-testing");

loadPluginFile(__dirname + "/../../src/index");

task(TASK_TEST, "Replace TEST task with any chain call", async () => {
  return await ethereum.send("eth_accounts");
});

task(TASK_RUN, "Replace RUN task with any chain call", async () => {
  return await ethereum.send("eth_accounts");
});

task("accounts", "Get all accounts in current network", async () => {
  return await ethereum.send("eth_accounts");
});

module.exports = {};
