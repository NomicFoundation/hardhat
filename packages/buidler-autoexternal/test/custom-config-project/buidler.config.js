require("../../src/index");

module.exports = {
  autoexternal: {
    enableForFileAnnotation: "#custom-annotation",
    exportableFunctionNamePattern: /^custom.*$/,
    functionNameTransformer: s => "transformed" + s,
    contractNameTransformer: s => "Custom" + s
  }
};
