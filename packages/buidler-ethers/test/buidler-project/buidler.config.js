const { loadPluginFile } = require("@nomiclabs/buidler/plugins-testing");
loadPluginFile(__dirname + "/../../src/index");

module.exports = {
  networks: {
    develop: {
      accounts: [
        "0xa95f9e3e7ae4e4865c5968828fe7c03fffa8a9f3bb52d36d26243f4c868ee166"
      ]
    }
  }
};
