require("../../src/index");

module.exports = {
  paths: {
    cache: __dirname + "/contracts/cache"
  },
  autoexternal: {
    enableForFileAnnotation: "#another-annotation"
  }
};
