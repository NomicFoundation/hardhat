const { loadPluginFile } = require("hardhat/plugins-testing");
loadPluginFile(__dirname + "/../../src/index");

module.exports = {
  solpp: {
    defs: {
      getLeet: () => 1337,
    },
  },
};
