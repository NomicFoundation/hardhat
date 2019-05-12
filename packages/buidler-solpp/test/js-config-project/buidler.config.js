const { loadPluginFile } = require("@nomiclabs/buidler/plugins");
loadPluginFile(__dirname + "/../../src/index");

module.exports = {
  solpp: {
    defs: {
      getLeet: () => 1337
    }
  }
};
