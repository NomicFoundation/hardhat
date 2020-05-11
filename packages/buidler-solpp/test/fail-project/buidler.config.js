const { loadPluginFile } = require("@nomiclabs/buidler/plugins-testing");
loadPluginFile(__dirname + "/../../src/index");

module.exports = {
  solpp: {
    defs: {
      MY_SYMBOL_1: 100,
      MY_SYMBOL_2: true,
      MY_SYMBOL_3: "48192.418291248",
      MY_SYMBOL_4: "blah blah",
      MY_SYMBOL_5: ["symbols", "can", "hold", "lists"],
    },
  },
};
